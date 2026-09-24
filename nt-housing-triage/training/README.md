# Fine-tuning the parser (Qwen2.5-3B-Instruct)

The parser is model-first with a deterministic fallback. This folder contains the
dataset generator and the recipe for the fine-tune. Everything runs locally on a
single NVIDIA RTX 3080 (8 GB).

## 1. Generate the dataset

```bash
npm run training:generate -- 3000
```

Writes `training/out/train.jsonl` and `training/out/eval.jsonl` in chat format:

```json
{"messages":[
  {"role":"system","content":"You are a maintenance triage parser ..."},
  {"role":"user","content":"roof is leaking over my kids bed ..."},
  {"role":"assistant","content":"{\"summary\":\"...\",\"category\":\"structural\",...}"}
]}
```

The assistant target is the exact schema in `.opencode/plan/nt-housing-triage-taxonomy.md` §1.
Because the deterministic fallback parser implements the same contract, you can
diff the two on the held-out split.

## 2. Fine-tune (unsloth + QLoRA, 4-bit)

```bash
pip install "unsloth[cu121-torch240] @ git+https://github.com/unslothai/unsloth.git"
```

```python
from unsloth import FastLanguageModel
from trl import SFTTrainer
from transformers import TrainingArguments
from datasets import load_dataset

model, tokenizer = FastLanguageModel.from_pretrained(
    model_name="unsloth/Qwen2.5-3B-Instruct-bnb-4bit",
    max_seq_length=1024, load_in_4bit=True,
)
model = FastLanguageModel.get_peft_model(model, r=16, lora_alpha=16,
    target_modules=["q_proj","k_proj","v_proj","o_proj","gate_proj","up_proj","down_proj"])

data = load_dataset("json", data_files={"train":"training/out/train.jsonl","eval":"training/out/eval.jsonl"})
data = data.map(lambda x: tokenizer.apply_chat_template(
    x["messages"], tokenize=False, add_generation_prompt=False))

SFTTrainer(model=model, tokenizer=tokenizer, train_dataset=data["train"],
    eval_dataset=data["eval"], dataset_text_field="text",
    args=TrainingArguments(per_device_train_batch_size=2, gradient_accumulation_steps=4,
        num_train_epochs=2, learning_rate=2e-4, bf16=True, output_dir="training/models/out",
        eval_strategy="steps", eval_steps=50)).train()
```

> 8 GB VRAM: batch size 2 with grad accumulation is comfortable for 3B in 4-bit.
> If VRAM is tight, lower `max_seq_length` to 768 or fall back to Qwen2.5-1.5B.
> Do not go to 8B on 8 GB.

## 3. Export GGUF and serve with Ollama

```python
model.save_pretrained_gguf("training/models/gguf", tokenizer, quantization_method="q4_k_m")
```

```bash
ollama create nt-housing-triage -f - <<'EOF'
FROM ./training/models/gguf/unsloth.Q4_K_M.gguf
PARAMETER temperature 0
EOF
```

Point the app at it (defaults shown):

```bash
OLLAMA_URL=http://127.0.0.1:11434
OLLAMA_MODEL=nt-housing-triage
```

The app calls `/api/chat` with `format: "json"` and temperature 0. If Ollama is
not reachable, `lib/parser/fallback.ts` produces the same JSON shape offline.

## 4. Evaluate

- Field-level F1 (category, safety_level, flags, vulnerability, trade) on
  `eval.jsonl`, base model vs fine-tuned.
- Small human-checked set of messy real-world phrasings.
- Optional: a Claude Haiku comparison to tell the "matched a big cloud model,
  fully offline" story.

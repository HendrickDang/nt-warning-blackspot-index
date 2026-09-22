import os
import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import warnings
warnings.filterwarnings('ignore')

# change working directory to the script's folder so csv and png files land in the right place
os.chdir(os.path.dirname(os.path.abspath(__file__)))

# load datasets
fire_history = pd.read_csv('NT_FireHistory.csv')
community_risk = pd.read_csv('Community_Bushfire_Risk.csv')
fire_mgmt_zones = pd.read_csv('Fire_Management_Zones.csv')
fire_prot_zones = pd.read_csv('Fire_Protection_Zones.csv')
emergency_areas = pd.read_csv('Emergency_Response_Areas.csv')

print("Dataset shapes:")
print(f"  NT Fire History:    {fire_history.shape}")
print(f"  Community Risk:     {community_risk.shape}")
print(f"  Fire Mgmt Zones:    {fire_mgmt_zones.shape}")
print(f"  Fire Prot Zones:    {fire_prot_zones.shape}")
print(f"  Emergency Areas:    {emergency_areas.shape}")

# clean fire history
fh = fire_history.copy()
fh['ignition_d'] = pd.to_datetime(fh['ignition_d'], errors='coerce')
fh['extinguish'] = pd.to_datetime(fh['extinguish'], errors='coerce')
fh['year'] = fh['ignition_d'].dt.year
fh['month'] = fh['ignition_d'].dt.month
fh['duration_days'] = (fh['extinguish'] - fh['ignition_d']).dt.days
fh_nt = fh[fh['state'] == 'NT'].copy()

# clean community risk
cr = community_risk.copy()
cr.columns = cr.columns.str.strip()
rating_map = {'Low': 1, 'Moderate': 2, 'High': 3}
cr['rating_num'] = cr['RATING'].map(rating_map)

print("\nNT fire history summary:")
print(f"  Total NT records: {len(fh_nt)}")
print(f"  Year range: {fh_nt['year'].min():.0f} to {fh_nt['year'].max():.0f}")
print(f"  Total area burned (ha): {fh_nt['area_ha'].sum():,.0f}")

print("\nCommunity risk summary:")
print(cr['RATING'].value_counts())
print(f"\nHigh-risk with no fire plan: {len(cr[(cr['RATING']=='High') & (cr['FIREPLAN']=='No')])}")
print(f"High-risk with no firebreak: {len(cr[(cr['RATING']=='High') & (cr['FIREBREAK']=='No')])}")


# figure 1 - community risk overview
fig, axes = plt.subplots(1, 2, figsize=(13, 5))
fig.suptitle('NT Community Bushfire Risk - Overview', fontsize=14, fontweight='bold')

colors = {'Low': '#4CAF50', 'Moderate': '#FF9800', 'High': '#F44336'}
rating_counts = cr['RATING'].value_counts().reindex(['Low', 'Moderate', 'High'])
bars = axes[0].bar(rating_counts.index, rating_counts.values,
                   color=[colors[r] for r in rating_counts.index],
                   edgecolor='white', linewidth=1.2)
axes[0].set_title('Communities by Risk Rating', fontweight='bold')
axes[0].set_xlabel('Risk Rating')
axes[0].set_ylabel('Number of Communities')
for bar, val in zip(bars, rating_counts.values):
    axes[0].text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 3,
                 str(val), ha='center', fontweight='bold')
axes[0].set_ylim(0, rating_counts.max() * 1.15)

high_risk = cr[cr['RATING'] == 'High']
plan_counts = high_risk['FIREPLAN'].value_counts()
axes[1].pie(plan_counts.values, labels=plan_counts.index, autopct='%1.1f%%',
            colors=['#F44336', '#4CAF50'], startangle=90,
            wedgeprops=dict(edgecolor='white', linewidth=1.5))
axes[1].set_title('High-Risk Communities:\nFire Plan Status', fontweight='bold')

plt.tight_layout()
plt.savefig('fig1_community_risk_overview.png', dpi=150, bbox_inches='tight')
plt.close()
print("Saved: fig1_community_risk_overview.png")


# figure 2 - fire history temporal patterns
fig, axes = plt.subplots(1, 2, figsize=(13, 5))
fig.suptitle('NT Fire History - Temporal Patterns', fontsize=14, fontweight='bold')

yearly = fh_nt.groupby('year').size().reset_index(name='count')
yearly = yearly[yearly['year'].between(2015, 2025)]
axes[0].bar(yearly['year'], yearly['count'], color='#E64A19', edgecolor='white', linewidth=0.8)
axes[0].set_title('NT Fires per Year (2015-2025)', fontweight='bold')
axes[0].set_xlabel('Year')
axes[0].set_ylabel('Number of Fire Events')
axes[0].tick_params(axis='x', rotation=45)

monthly = fh_nt.groupby('month').size().reset_index(name='count')
month_names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
monthly['month_name'] = monthly['month'].apply(lambda x: month_names[x - 1])
bar_colors = ['#1565C0' if m in [6, 7, 8, 9] else '#E64A19' for m in monthly['month']]
axes[1].bar(monthly['month_name'], monthly['count'], color=bar_colors, edgecolor='white', linewidth=0.8)
axes[1].set_title('Fire Events by Month (Seasonality)', fontweight='bold')
axes[1].set_xlabel('Month')
axes[1].set_ylabel('Number of Fire Events')
dry_patch = mpatches.Patch(color='#1565C0', label='Peak Dry Season (Jun-Sep)')
wet_patch = mpatches.Patch(color='#E64A19', label='Other Months')
axes[1].legend(handles=[dry_patch, wet_patch], fontsize=9)

plt.tight_layout()
plt.savefig('fig2_fire_history_temporal.png', dpi=150, bbox_inches='tight')
plt.close()
print("Saved: fig2_fire_history_temporal.png")


# figure 3 - impact and preparedness
fig, axes = plt.subplots(1, 2, figsize=(13, 5))
fig.suptitle('NT Bushfire Impact & Preparedness Gap', fontsize=14, fontweight='bold')

area_type = fh_nt.groupby('fire_type')['area_ha'].sum().sort_values(ascending=False).head(6)
axes[0].barh(area_type.index, area_type.values / 1000, color='#BF360C', edgecolor='white')
axes[0].set_title('Total Area Burned by Fire Type\n(NT, x1,000 ha)', fontweight='bold')
axes[0].set_xlabel('Area (x1,000 hectares)')

prep_data = {}
for rating in ['Low', 'Moderate', 'High']:
    grp = cr[cr['RATING'] == rating]
    prep_data[rating] = {
        'Fuel Reduction (%)': (grp['FUELREDUC'] == 'Yes').mean() * 100,
        'Firebreak (%)': (grp['FIREBREAK'] == 'Yes').mean() * 100,
        'Fire Plan (%)': (grp['FIREPLAN'] == 'Yes').mean() * 100,
    }
prep = pd.DataFrame(prep_data).T

im = axes[1].imshow(prep.values, cmap='RdYlGn', aspect='auto', vmin=0, vmax=100)
axes[1].set_xticks(range(3))
axes[1].set_xticklabels(prep.columns, fontsize=10)
axes[1].set_yticks(range(3))
axes[1].set_yticklabels(prep.index, fontsize=10)
axes[1].set_title('Preparedness by Risk Rating\n(% of communities with measure in place)', fontweight='bold')
for i in range(3):
    for j in range(3):
        axes[1].text(j, i, f'{prep.values[i, j]:.0f}%',
                     ha='center', va='center', fontweight='bold',
                     color='white' if prep.values[i, j] < 40 else 'black')
plt.colorbar(im, ax=axes[1], label='% Communities')

plt.tight_layout()
plt.savefig('fig3_impact_preparedness.png', dpi=150, bbox_inches='tight')
plt.close()
print("Saved: fig3_impact_preparedness.png")


# figure 4 - geographic distribution
cr_geo = cr.dropna(subset=['LATITUDE', 'LONGITUDE'])
fig, ax = plt.subplots(figsize=(8, 9))
color_map = {'Low': '#4CAF50', 'Moderate': '#FF9800', 'High': '#F44336'}
size_map = {'Low': 20, 'Moderate': 35, 'High': 60}
for rating in ['Low', 'Moderate', 'High']:
    subset = cr_geo[cr_geo['RATING'] == rating]
    ax.scatter(subset['LONGITUDE'], subset['LATITUDE'],
               c=color_map[rating], s=size_map[rating],
               alpha=0.7, label=f'{rating} ({len(subset)})',
               edgecolors='white', linewidths=0.3)
ax.set_title('NT Community Bushfire Risk - Geographic Distribution', fontweight='bold', fontsize=12)
ax.set_xlabel('Longitude')
ax.set_ylabel('Latitude')
ax.legend(title='Risk Rating', fontsize=10)
ax.set_facecolor('#E8F4F8')
ax.grid(True, alpha=0.3)
plt.tight_layout()
plt.savefig('fig4_geographic_distribution.png', dpi=150, bbox_inches='tight')
plt.close()
print("Saved: fig4_geographic_distribution.png")


# key stats
print("\nKey statistics:")
print(f"  Total NT fire events: {len(fh_nt)}")
print(f"  Total area burned: {fh_nt['area_ha'].sum():,.0f} ha")
print(f"  Average fire size: {fh_nt['area_ha'].mean():,.0f} ha")
print(f"  Largest fire: {fh_nt['area_ha'].max():,.0f} ha")
print(f"  Total communities: {len(cr)}")
print(f"  High risk: {len(cr[cr['RATING']=='High'])} ({len(cr[cr['RATING']=='High'])/len(cr)*100:.1f}%)")
print(f"  Moderate risk: {len(cr[cr['RATING']=='Moderate'])} ({len(cr[cr['RATING']=='Moderate'])/len(cr)*100:.1f}%)")
print(f"  Low risk: {len(cr[cr['RATING']=='Low'])} ({len(cr[cr['RATING']=='Low'])/len(cr)*100:.1f}%)")
print(f"  High-risk with no fire plan: {len(cr[(cr['RATING']=='High') & (cr['FIREPLAN']=='No')])}")
print(f"  High-risk with no firebreak: {len(cr[(cr['RATING']=='High') & (cr['FIREBREAK']=='No')])}")
print(f"  High-risk with no fuel reduction: {len(cr[(cr['RATING']=='High') & (cr['FUELREDUC']=='No')])}")

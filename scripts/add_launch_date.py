import json
import os

# 获取脚本所在目录的父目录
script_dir = os.path.dirname(os.path.abspath(__file__))
project_dir = os.path.dirname(script_dir)
file_path = os.path.join(project_dir, 'data', 'dashboard', 'dim_sku.json')

season_to_month = {
    'Q1': '02-01',
    'Q2': '05-01',
    'Q3': '08-01',
    'Q4': '11-01'
}

with open(file_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

for sku in data:
    if 'season_year' in sku and 'season' in sku:
        sku['launch_date'] = f"{sku['season_year']}-{season_to_month[sku['season']]}"

with open(file_path, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print(f'成功更新 {len(data)} 条 SKU 记录')
print('前 3 条示例:')
for sku in data[:3]:
    print(f"  SKU: {sku['sku_id']}, Season: {sku['season_year']} {sku['season']}, Launch Date: {sku['launch_date']}")

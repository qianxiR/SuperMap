import pandas as pd
import sqlite3
import os
from datetime import datetime
import re

def process_water_quality_data():
    """
    处理水质监测数据：
    1. 移除包含null值的行
    2. 按地点名称分组
    3. 按时间排序
    4. 输出处理后的数据
    """
    
    # 输入数据格式：从SQL文件读取INSERT语句
    sql_file_path = "Frontend/src/views/dashboard/ViewPage/湖北省长江流域2023年1月数据_UTF8.sql"
    
    # 数据处理方法
    def parse_sql_insert(sql_file):
        """解析SQL INSERT语句并提取数据"""
        data_records = []
        
        with open(sql_file, 'r', encoding='utf-8') as f:
            content = f.read()
            
        # 使用正则表达式提取VALUES部分的数据
        pattern = r"VALUES\s*\(([^)]+)\)"
        matches = re.findall(pattern, content)
        
        for match in matches:
            # 分割数据并清理引号
            values = []
            current_value = ""
            in_quotes = False
            quote_char = None
            
            for char in match:
                if char in ["'", '"'] and (not in_quotes or quote_char == char):
                    if not in_quotes:
                        in_quotes = True
                        quote_char = char
                    else:
                        in_quotes = False
                        quote_char = None
                elif char == ',' and not in_quotes:
                    values.append(current_value.strip().strip("'\""))
                    current_value = ""
                    continue
                current_value += char
            
            if current_value.strip():
                values.append(current_value.strip().strip("'\""))
            
            data_records.append(values)
        
        return data_records
    
    def create_dataframe(data_records):
        """创建DataFrame"""
        columns = [
            "province", "watershed", "site_name", "monitor_time", "water_quality_class",
            "water_temperature", "ph_value", "dissolved_oxygen", "conductivity", "turbidity",
            "permanganate_index", "ammonia_nitrogen", "total_phosphorus", "total_nitrogen",
            "chlorophyll_a", "algae_density", "site_status", "longitude", "latitude",
            "formatted_address", "match_level"
        ]
        
        df = pd.DataFrame(data_records, columns=columns)
        return df
    
    def remove_null_rows(df):
        """移除包含null值的行"""
        # 将'*'、'null'、空字符串等视为null值
        null_values = ['*', 'null', 'NULL', '', 'None']
        
        for col in df.columns:
            df[col] = df[col].replace(null_values, pd.NA)
        
        # 移除任何列包含null值的行
        df_cleaned = df.dropna()
        return df_cleaned
    
    def convert_time_format(df):
        """转换时间格式"""
        def parse_time(time_str):
            try:
                # 处理"2023/1/1 2:53"格式
                return pd.to_datetime(time_str, format='%Y/%m/%d %H:%M')
            except:
                try:
                    # 处理其他可能的时间格式
                    return pd.to_datetime(time_str)
                except:
                    return pd.NaT
        
        df['monitor_time'] = df['monitor_time'].apply(parse_time)
        return df
    
    def group_and_sort_data(df):
        """按地点分组并按时间排序"""
        # 按formatted_address分组
        grouped = df.groupby('formatted_address')
        
        result_data = []
        
        for location, group in grouped:
            # 按时间排序
            group_sorted = group.sort_values('monitor_time')
            
            # 检查是否有30天的数据
            if len(group_sorted) > 0:
                result_data.append({
                    'location': location,
                    'data_count': len(group_sorted),
                    'date_range': f"{group_sorted['monitor_time'].min()} 到 {group_sorted['monitor_time'].max()}",
                    'data': group_sorted
                })
        
        return result_data
    
    def save_processed_data(result_data):
        """保存处理后的数据"""
        # 创建输出目录
        output_dir = "Backend/processed_data"
        os.makedirs(output_dir, exist_ok=True)
        
        # 保存汇总信息
        summary_data = []
        for item in result_data:
            summary_data.append({
                'location': item['location'],
                'data_count': item['data_count'],
                'date_range': item['date_range']
            })
        
        summary_df = pd.DataFrame(summary_data)
        summary_df.to_csv(f"{output_dir}/data_summary.csv", index=False, encoding='utf-8-sig')
        
        # 保存每个地点的详细数据
        for item in result_data:
            location_name = item['location'].replace('/', '_').replace('\\', '_')
            item['data'].to_csv(f"{output_dir}/{location_name}_data.csv", index=False, encoding='utf-8-sig')
        
        # 合并所有数据并保存
        all_data = pd.concat([item['data'] for item in result_data], ignore_index=True)
        all_data.to_csv(f"{output_dir}/all_processed_data.csv", index=False, encoding='utf-8-sig')
        
        return summary_df, all_data
    
    # 主要处理流程
    try:
        # 读取SQL数据
        data_records = parse_sql_insert(sql_file_path)
        
        if not data_records:
            print("未找到有效的INSERT数据")
            return
        
        # 创建DataFrame
        df = create_dataframe(data_records)
        print(f"原始数据行数: {len(df)}")
        
        # 移除null值
        df_cleaned = remove_null_rows(df)
        print(f"移除null值后行数: {len(df_cleaned)}")
        
        # 转换时间格式
        df_cleaned = convert_time_format(df_cleaned)
        
        # 按地点分组并排序
        result_data = group_and_sort_data(df_cleaned)
        
        # 保存处理后的数据
        summary_df, all_data = save_processed_data(result_data)
        
        # 输出数据格式
        print("\n=== 处理结果汇总 ===")
        print(f"有效地点数量: {len(result_data)}")
        print("\n各地点数据统计:")
        for _, row in summary_df.iterrows():
            print(f"- {row['location']}: {row['data_count']}条记录 ({row['date_range']})")
        
        print(f"\n所有数据已保存到 Backend/processed_data/ 目录")
        print(f"总计有效记录数: {len(all_data)}")
        
        return {
            'summary': summary_df,
            'all_data': all_data,
            'grouped_data': result_data
        }
        
    except Exception as e:
        print(f"处理过程中出现错误: {str(e)}")
        return None

if __name__ == "__main__":
    result = process_water_quality_data()

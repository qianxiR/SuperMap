-- 水系数据统计汇总查询
-- 基于NAME字段模糊匹配进行分类统计

-- ===========================================
-- 1. 水系面统计 (基于NAME字段模糊匹配分类统计SmPerimeter周长)
-- ===========================================

-- 方法1: 水系面按NAME分类统计周长
SELECT 
    '水系面总数量' AS 统计类型,
    COUNT(*) AS 数量,
    SUM(CAST("SmPerimeter" AS FLOAT)) AS 总周长,
    ROUND(CAST(SUM(CAST("SmPerimeter" AS FLOAT)) / 1000 AS NUMERIC), 2) AS 总周长公里,
    ROUND(CAST(AVG(CAST("SmPerimeter" AS FLOAT)) AS NUMERIC), 2) AS 平均周长
FROM "水系面"
WHERE "SmPerimeter" IS NOT NULL AND "SmPerimeter" != '' AND CAST("SmPerimeter" AS FLOAT) > 0

UNION ALL

SELECT 
    '湖类水系面' AS 统计类型,
    COUNT(*) AS 数量,
    SUM(CAST("SmPerimeter" AS FLOAT)) AS 总周长,
    ROUND(CAST(SUM(CAST("SmPerimeter" AS FLOAT)) / 1000 AS NUMERIC), 2) AS 总周长公里,
    ROUND(CAST(AVG(CAST("SmPerimeter" AS FLOAT)) AS NUMERIC), 2) AS 平均周长
FROM "水系面"
WHERE "NAME" LIKE '%湖%' AND "SmPerimeter" IS NOT NULL AND "SmPerimeter" != '' AND CAST("SmPerimeter" AS FLOAT) > 0

UNION ALL

SELECT 
    '海类水系面' AS 统计类型,
    COUNT(*) AS 数量,
    SUM(CAST("SmPerimeter" AS FLOAT)) AS 总周长,
    ROUND(CAST(SUM(CAST("SmPerimeter" AS FLOAT)) / 1000 AS NUMERIC), 2) AS 总周长公里,
    ROUND(CAST(AVG(CAST("SmPerimeter" AS FLOAT)) AS NUMERIC), 2) AS 平均周长
FROM "水系面"
WHERE "NAME" LIKE '%海%' AND "SmPerimeter" IS NOT NULL AND "SmPerimeter" != '' AND CAST("SmPerimeter" AS FLOAT) > 0

UNION ALL

SELECT 
    '港类水系面' AS 统计类型,
    COUNT(*) AS 数量,
    SUM(CAST("SmPerimeter" AS FLOAT)) AS 总周长,
    ROUND(CAST(SUM(CAST("SmPerimeter" AS FLOAT)) / 1000 AS NUMERIC), 2) AS 总周长公里,
    ROUND(CAST(AVG(CAST("SmPerimeter" AS FLOAT)) AS NUMERIC), 2) AS 平均周长
FROM "水系面"
WHERE "NAME" LIKE '%港%' AND "SmPerimeter" IS NOT NULL AND "SmPerimeter" != '' AND CAST("SmPerimeter" AS FLOAT) > 0

UNION ALL

SELECT 
    '水库类水系面' AS 统计类型,
    COUNT(*) AS 数量,
    SUM(CAST("SmPerimeter" AS FLOAT)) AS 总周长,
    ROUND(CAST(SUM(CAST("SmPerimeter" AS FLOAT)) / 1000 AS NUMERIC), 2) AS 总周长公里,
    ROUND(CAST(AVG(CAST("SmPerimeter" AS FLOAT)) AS NUMERIC), 2) AS 平均周长
FROM "水系面"
WHERE "NAME" LIKE '%水库%' AND "SmPerimeter" IS NOT NULL AND "SmPerimeter" != '' AND CAST("SmPerimeter" AS FLOAT) > 0

ORDER BY 统计类型;

-- ===========================================
-- 2. 水系线统计 (基于NAME字段模糊匹配分类统计SmLength长度)
-- ===========================================

-- 方法2: 水系线按NAME分类统计长度
SELECT 
    '水系线总数量' AS 统计类型,
    COUNT(*) AS 数量,
    SUM(CAST("SmLength" AS FLOAT)) AS 总长度,
    ROUND(CAST(SUM(CAST("SmLength" AS FLOAT)) / 1000 AS NUMERIC), 2) AS 总长度公里,
    ROUND(CAST(AVG(CAST("SmLength" AS FLOAT)) AS NUMERIC), 2) AS 平均长度
FROM "水系线"
WHERE "SmLength" IS NOT NULL AND "SmLength" != '' AND CAST("SmLength" AS FLOAT) > 0

UNION ALL

SELECT 
    '干渠类水系线' AS 统计类型,
    COUNT(*) AS 数量,
    SUM(CAST("SmLength" AS FLOAT)) AS 总长度,
    ROUND(CAST(SUM(CAST("SmLength" AS FLOAT)) / 1000 AS NUMERIC), 2) AS 总长度公里,
    ROUND(CAST(AVG(CAST("SmLength" AS FLOAT)) AS NUMERIC), 2) AS 平均长度
FROM "水系线"
WHERE "NAME" LIKE '%干渠%' AND "SmLength" IS NOT NULL AND "SmLength" != '' AND CAST("SmLength" AS FLOAT) > 0

UNION ALL

SELECT 
    '河类水系线' AS 统计类型,
    COUNT(*) AS 数量,
    SUM(CAST("SmLength" AS FLOAT)) AS 总长度,
    ROUND(CAST(SUM(CAST("SmLength" AS FLOAT)) / 1000 AS NUMERIC), 2) AS 总长度公里,
    ROUND(CAST(AVG(CAST("SmLength" AS FLOAT)) AS NUMERIC), 2) AS 平均长度
FROM "水系线"
WHERE "NAME" LIKE '%河%' AND "SmLength" IS NOT NULL AND "SmLength" != '' AND CAST("SmLength" AS FLOAT) > 0

UNION ALL

SELECT 
    '沟类水系线' AS 统计类型,
    COUNT(*) AS 数量,
    SUM(CAST("SmLength" AS FLOAT)) AS 总长度,
    ROUND(CAST(SUM(CAST("SmLength" AS FLOAT)) / 1000 AS NUMERIC), 2) AS 总长度公里,
    ROUND(CAST(AVG(CAST("SmLength" AS FLOAT)) AS NUMERIC), 2) AS 平均长度
FROM "水系线"
WHERE "NAME" LIKE '%沟%' AND "SmLength" IS NOT NULL AND "SmLength" != '' AND CAST("SmLength" AS FLOAT) > 0

UNION ALL

SELECT 
    '倒水类水系线' AS 统计类型,
    COUNT(*) AS 数量,
    SUM(CAST("SmLength" AS FLOAT)) AS 总长度,
    ROUND(CAST(SUM(CAST("SmLength" AS FLOAT)) / 1000 AS NUMERIC), 2) AS 总长度公里,
    ROUND(CAST(AVG(CAST("SmLength" AS FLOAT)) AS NUMERIC), 2) AS 平均长度
FROM "水系线"
WHERE "NAME" LIKE '%倒水%' AND "SmLength" IS NOT NULL AND "SmLength" != '' AND CAST("SmLength" AS FLOAT) > 0

UNION ALL

SELECT 
    '江类水系线' AS 统计类型,
    COUNT(*) AS 数量,
    SUM(CAST("SmLength" AS FLOAT)) AS 总长度,
    ROUND(CAST(SUM(CAST("SmLength" AS FLOAT)) / 1000 AS NUMERIC), 2) AS 总长度公里,
    ROUND(CAST(AVG(CAST("SmLength" AS FLOAT)) AS NUMERIC), 2) AS 平均长度
FROM "水系线"
WHERE "NAME" LIKE '%江%' AND "SmLength" IS NOT NULL AND "SmLength" != '' AND CAST("SmLength" AS FLOAT) > 0

UNION ALL

SELECT 
    '举水类水系线' AS 统计类型,
    COUNT(*) AS 数量,
    SUM(CAST("SmLength" AS FLOAT)) AS 总长度,
    ROUND(CAST(SUM(CAST("SmLength" AS FLOAT)) / 1000 AS NUMERIC), 2) AS 总长度公里,
    ROUND(CAST(AVG(CAST("SmLength" AS FLOAT)) AS NUMERIC), 2) AS 平均长度
FROM "水系线"
WHERE "NAME" LIKE '%举水%' AND "SmLength" IS NOT NULL AND "SmLength" != '' AND CAST("SmLength" AS FLOAT) > 0

UNION ALL

SELECT 
    '干沟类水系线' AS 统计类型,
    COUNT(*) AS 数量,
    SUM(CAST("SmLength" AS FLOAT)) AS 总长度,
    ROUND(CAST(SUM(CAST("SmLength" AS FLOAT)) / 1000 AS NUMERIC), 2) AS 总长度公里,
    ROUND(CAST(AVG(CAST("SmLength" AS FLOAT)) AS NUMERIC), 2) AS 平均长度
FROM "水系线"
WHERE "NAME" LIKE '%干沟%' AND "SmLength" IS NOT NULL AND "SmLength" != '' AND CAST("SmLength" AS FLOAT) > 0

ORDER BY 统计类型;

-- ===========================================
-- 3. 综合统计表创建
-- ===========================================

-- 创建水系面分类统计表
CREATE TABLE IF NOT EXISTS "水系面分类统计表" (
    "统计类型" VARCHAR(50) PRIMARY KEY,
    "分类关键词" VARCHAR(20),
    "数量" INTEGER,
    "周长总计" FLOAT,
    "周长总计公里" NUMERIC(10,2),
    "平均周长" NUMERIC(10,2),
    "创建时间" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建水系线分类统计表
CREATE TABLE IF NOT EXISTS "水系线分类统计表" (
    "统计类型" VARCHAR(50) PRIMARY KEY,
    "分类关键词" VARCHAR(20),
    "数量" INTEGER,
    "长度总计" FLOAT,
    "长度总计公里" NUMERIC(10,2),
    "平均长度" NUMERIC(10,2),
    "创建时间" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建综合统计表
CREATE TABLE IF NOT EXISTS "水系数据分类统计" (
    "统计类型" VARCHAR(50) PRIMARY KEY,
    "数据表名" VARCHAR(20),
    "分类关键词" VARCHAR(20),
    "数量" INTEGER,
    "数值总计" FLOAT,
    "数值单位" VARCHAR(20),
    "平均值" FLOAT,
    "创建时间" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 清空现有数据
DELETE FROM "水系面分类统计表";
DELETE FROM "水系线分类统计表";
DELETE FROM "水系数据分类统计";

-- 插入水系面分类统计到专用表
INSERT INTO "水系面分类统计表" ("统计类型", "分类关键词", "数量", "周长总计", "周长总计公里", "平均周长")
SELECT 
    '水系面总周长',
    '全部',
    COUNT(*),
    SUM(CAST("SmPerimeter" AS FLOAT)),
    ROUND(CAST(SUM(CAST("SmPerimeter" AS FLOAT)) / 1000 AS NUMERIC), 2),
    ROUND(CAST(AVG(CAST("SmPerimeter" AS FLOAT)) AS NUMERIC), 2)
FROM "水系面"
WHERE "SmPerimeter" IS NOT NULL AND "SmPerimeter" != '' AND CAST("SmPerimeter" AS FLOAT) > 0;

INSERT INTO "水系面分类统计表" ("统计类型", "分类关键词", "数量", "周长总计", "周长总计公里", "平均周长")
SELECT 
    '湖类水系面周长',
    '湖',
    COUNT(*),
    SUM(CAST("SmPerimeter" AS FLOAT)),
    ROUND(CAST(SUM(CAST("SmPerimeter" AS FLOAT)) / 1000 AS NUMERIC), 2),
    ROUND(CAST(AVG(CAST("SmPerimeter" AS FLOAT)) AS NUMERIC), 2)
FROM "水系面"
WHERE "NAME" LIKE '%湖%' AND "SmPerimeter" IS NOT NULL AND "SmPerimeter" != '' AND CAST("SmPerimeter" AS FLOAT) > 0;

INSERT INTO "水系面分类统计表" ("统计类型", "分类关键词", "数量", "周长总计", "周长总计公里", "平均周长")
SELECT 
    '海类水系面周长',
    '海',
    COUNT(*),
    SUM(CAST("SmPerimeter" AS FLOAT)),
    ROUND(CAST(SUM(CAST("SmPerimeter" AS FLOAT)) / 1000 AS NUMERIC), 2),
    ROUND(CAST(AVG(CAST("SmPerimeter" AS FLOAT)) AS NUMERIC), 2)
FROM "水系面"
WHERE "NAME" LIKE '%海%' AND "SmPerimeter" IS NOT NULL AND "SmPerimeter" != '' AND CAST("SmPerimeter" AS FLOAT) > 0;

INSERT INTO "水系面分类统计表" ("统计类型", "分类关键词", "数量", "周长总计", "周长总计公里", "平均周长")
SELECT 
    '港类水系面周长',
    '港',
    COUNT(*),
    SUM(CAST("SmPerimeter" AS FLOAT)),
    ROUND(CAST(SUM(CAST("SmPerimeter" AS FLOAT)) / 1000 AS NUMERIC), 2),
    ROUND(CAST(AVG(CAST("SmPerimeter" AS FLOAT)) AS NUMERIC), 2)
FROM "水系面"
WHERE "NAME" LIKE '%港%' AND "SmPerimeter" IS NOT NULL AND "SmPerimeter" != '' AND CAST("SmPerimeter" AS FLOAT) > 0;

INSERT INTO "水系面分类统计表" ("统计类型", "分类关键词", "数量", "周长总计", "周长总计公里", "平均周长")
SELECT 
    '水库类水系面周长',
    '水库',
    COUNT(*),
    SUM(CAST("SmPerimeter" AS FLOAT)),
    ROUND(CAST(SUM(CAST("SmPerimeter" AS FLOAT)) / 1000 AS NUMERIC), 2),
    ROUND(CAST(AVG(CAST("SmPerimeter" AS FLOAT)) AS NUMERIC), 2)
FROM "水系面"
WHERE "NAME" LIKE '%水库%' AND "SmPerimeter" IS NOT NULL AND "SmPerimeter" != '' AND CAST("SmPerimeter" AS FLOAT) > 0;

-- 插入水系面分类统计到综合表
INSERT INTO "水系数据分类统计" ("统计类型", "数据表名", "分类关键词", "数量", "数值总计", "数值单位", "平均值")
SELECT 
    '水系面总周长',
    '水系面',
    '全部',
    COUNT(*),
    SUM(CAST("SmPerimeter" AS FLOAT)),
    '米',
    AVG(CAST("SmPerimeter" AS FLOAT))
FROM "水系面"
WHERE "SmPerimeter" IS NOT NULL AND "SmPerimeter" != '' AND CAST("SmPerimeter" AS FLOAT) > 0;

INSERT INTO "水系数据分类统计" ("统计类型", "数据表名", "分类关键词", "数量", "数值总计", "数值单位", "平均值")
SELECT 
    '湖类水系面周长',
    '水系面',
    '湖',
    COUNT(*),
    SUM(CAST("SmPerimeter" AS FLOAT)),
    '米',
    AVG(CAST("SmPerimeter" AS FLOAT))
FROM "水系面"
WHERE "NAME" LIKE '%湖%' AND "SmPerimeter" IS NOT NULL AND "SmPerimeter" != '' AND CAST("SmPerimeter" AS FLOAT) > 0;

INSERT INTO "水系数据分类统计" ("统计类型", "数据表名", "分类关键词", "数量", "数值总计", "数值单位", "平均值")
SELECT 
    '海类水系面周长',
    '水系面',
    '海',
    COUNT(*),
    SUM(CAST("SmPerimeter" AS FLOAT)),
    '米',
    AVG(CAST("SmPerimeter" AS FLOAT))
FROM "水系面"
WHERE "NAME" LIKE '%海%' AND "SmPerimeter" IS NOT NULL AND "SmPerimeter" != '' AND CAST("SmPerimeter" AS FLOAT) > 0;

INSERT INTO "水系数据分类统计" ("统计类型", "数据表名", "分类关键词", "数量", "数值总计", "数值单位", "平均值")
SELECT 
    '港类水系面周长',
    '水系面',
    '港',
    COUNT(*),
    SUM(CAST("SmPerimeter" AS FLOAT)),
    '米',
    AVG(CAST("SmPerimeter" AS FLOAT))
FROM "水系面"
WHERE "NAME" LIKE '%港%' AND "SmPerimeter" IS NOT NULL AND "SmPerimeter" != '' AND CAST("SmPerimeter" AS FLOAT) > 0;

INSERT INTO "水系数据分类统计" ("统计类型", "数据表名", "分类关键词", "数量", "数值总计", "数值单位", "平均值")
SELECT 
    '水库类水系面周长',
    '水系面',
    '水库',
    COUNT(*),
    SUM(CAST("SmPerimeter" AS FLOAT)),
    '米',
    AVG(CAST("SmPerimeter" AS FLOAT))
FROM "水系面"
WHERE "NAME" LIKE '%水库%' AND "SmPerimeter" IS NOT NULL AND "SmPerimeter" != '' AND CAST("SmPerimeter" AS FLOAT) > 0;

-- 插入水系线分类统计到专用表
INSERT INTO "水系线分类统计表" ("统计类型", "分类关键词", "数量", "长度总计", "长度总计公里", "平均长度")
SELECT 
    '水系线总长度',
    '全部',
    COUNT(*),
    SUM(CAST("SmLength" AS FLOAT)),
    ROUND(CAST(SUM(CAST("SmLength" AS FLOAT)) / 1000 AS NUMERIC), 2),
    ROUND(CAST(AVG(CAST("SmLength" AS FLOAT)) AS NUMERIC), 2)
FROM "水系线"
WHERE "SmLength" IS NOT NULL AND "SmLength" != '' AND CAST("SmLength" AS FLOAT) > 0;

INSERT INTO "水系线分类统计表" ("统计类型", "分类关键词", "数量", "长度总计", "长度总计公里", "平均长度")
SELECT 
    '干渠类水系线长度',
    '干渠',
    COUNT(*),
    SUM(CAST("SmLength" AS FLOAT)),
    ROUND(CAST(SUM(CAST("SmLength" AS FLOAT)) / 1000 AS NUMERIC), 2),
    ROUND(CAST(AVG(CAST("SmLength" AS FLOAT)) AS NUMERIC), 2)
FROM "水系线"
WHERE "NAME" LIKE '%干渠%' AND "SmLength" IS NOT NULL AND "SmLength" != '' AND CAST("SmLength" AS FLOAT) > 0;

INSERT INTO "水系线分类统计表" ("统计类型", "分类关键词", "数量", "长度总计", "长度总计公里", "平均长度")
SELECT 
    '河类水系线长度',
    '河',
    COUNT(*),
    SUM(CAST("SmLength" AS FLOAT)),
    ROUND(CAST(SUM(CAST("SmLength" AS FLOAT)) / 1000 AS NUMERIC), 2),
    ROUND(CAST(AVG(CAST("SmLength" AS FLOAT)) AS NUMERIC), 2)
FROM "水系线"
WHERE "NAME" LIKE '%河%' AND "SmLength" IS NOT NULL AND "SmLength" != '' AND CAST("SmLength" AS FLOAT) > 0;

INSERT INTO "水系线分类统计表" ("统计类型", "分类关键词", "数量", "长度总计", "长度总计公里", "平均长度")
SELECT 
    '沟类水系线长度',
    '沟',
    COUNT(*),
    SUM(CAST("SmLength" AS FLOAT)),
    ROUND(CAST(SUM(CAST("SmLength" AS FLOAT)) / 1000 AS NUMERIC), 2),
    ROUND(CAST(AVG(CAST("SmLength" AS FLOAT)) AS NUMERIC), 2)
FROM "水系线"
WHERE "NAME" LIKE '%沟%' AND "SmLength" IS NOT NULL AND "SmLength" != '' AND CAST("SmLength" AS FLOAT) > 0;

INSERT INTO "水系线分类统计表" ("统计类型", "分类关键词", "数量", "长度总计", "长度总计公里", "平均长度")
SELECT 
    '倒水类水系线长度',
    '倒水',
    COUNT(*),
    SUM(CAST("SmLength" AS FLOAT)),
    ROUND(CAST(SUM(CAST("SmLength" AS FLOAT)) / 1000 AS NUMERIC), 2),
    ROUND(CAST(AVG(CAST("SmLength" AS FLOAT)) AS NUMERIC), 2)
FROM "水系线"
WHERE "NAME" LIKE '%倒水%' AND "SmLength" IS NOT NULL AND "SmLength" != '' AND CAST("SmLength" AS FLOAT) > 0;

INSERT INTO "水系线分类统计表" ("统计类型", "分类关键词", "数量", "长度总计", "长度总计公里", "平均长度")
SELECT 
    '江类水系线长度',
    '江',
    COUNT(*),
    SUM(CAST("SmLength" AS FLOAT)),
    ROUND(CAST(SUM(CAST("SmLength" AS FLOAT)) / 1000 AS NUMERIC), 2),
    ROUND(CAST(AVG(CAST("SmLength" AS FLOAT)) AS NUMERIC), 2)
FROM "水系线"
WHERE "NAME" LIKE '%江%' AND "SmLength" IS NOT NULL AND "SmLength" != '' AND CAST("SmLength" AS FLOAT) > 0;

INSERT INTO "水系线分类统计表" ("统计类型", "分类关键词", "数量", "长度总计", "长度总计公里", "平均长度")
SELECT 
    '举水类水系线长度',
    '举水',
    COUNT(*),
    SUM(CAST("SmLength" AS FLOAT)),
    ROUND(CAST(SUM(CAST("SmLength" AS FLOAT)) / 1000 AS NUMERIC), 2),
    ROUND(CAST(AVG(CAST("SmLength" AS FLOAT)) AS NUMERIC), 2)
FROM "水系线"
WHERE "NAME" LIKE '%举水%' AND "SmLength" IS NOT NULL AND "SmLength" != '' AND CAST("SmLength" AS FLOAT) > 0;

INSERT INTO "水系线分类统计表" ("统计类型", "分类关键词", "数量", "长度总计", "长度总计公里", "平均长度")
SELECT 
    '干沟类水系线长度',
    '干沟',
    COUNT(*),
    SUM(CAST("SmLength" AS FLOAT)),
    ROUND(CAST(SUM(CAST("SmLength" AS FLOAT)) / 1000 AS NUMERIC), 2),
    ROUND(CAST(AVG(CAST("SmLength" AS FLOAT)) AS NUMERIC), 2)
FROM "水系线"
WHERE "NAME" LIKE '%干沟%' AND "SmLength" IS NOT NULL AND "SmLength" != '' AND CAST("SmLength" AS FLOAT) > 0;

-- 插入水系线分类统计到综合表
INSERT INTO "水系数据分类统计" ("统计类型", "数据表名", "分类关键词", "数量", "数值总计", "数值单位", "平均值")
SELECT 
    '水系线总长度',
    '水系线',
    '全部',
    COUNT(*),
    SUM(CAST("SmLength" AS FLOAT)),
    '米',
    AVG(CAST("SmLength" AS FLOAT))
FROM "水系线"
WHERE "SmLength" IS NOT NULL AND "SmLength" != '' AND CAST("SmLength" AS FLOAT) > 0;

INSERT INTO "水系数据分类统计" ("统计类型", "数据表名", "分类关键词", "数量", "数值总计", "数值单位", "平均值")
SELECT 
    '干渠类水系线长度',
    '水系线',
    '干渠',
    COUNT(*),
    SUM(CAST("SmLength" AS FLOAT)),
    '米',
    AVG(CAST("SmLength" AS FLOAT))
FROM "水系线"
WHERE "NAME" LIKE '%干渠%' AND "SmLength" IS NOT NULL AND "SmLength" != '' AND CAST("SmLength" AS FLOAT) > 0;

INSERT INTO "水系数据分类统计" ("统计类型", "数据表名", "分类关键词", "数量", "数值总计", "数值单位", "平均值")
SELECT 
    '河类水系线长度',
    '水系线',
    '河',
    COUNT(*),
    SUM(CAST("SmLength" AS FLOAT)),
    '米',
    AVG(CAST("SmLength" AS FLOAT))
FROM "水系线"
WHERE "NAME" LIKE '%河%' AND "SmLength" IS NOT NULL AND "SmLength" != '' AND CAST("SmLength" AS FLOAT) > 0;

INSERT INTO "水系数据分类统计" ("统计类型", "数据表名", "分类关键词", "数量", "数值总计", "数值单位", "平均值")
SELECT 
    '沟类水系线长度',
    '水系线',
    '沟',
    COUNT(*),
    SUM(CAST("SmLength" AS FLOAT)),
    '米',
    AVG(CAST("SmLength" AS FLOAT))
FROM "水系线"
WHERE "NAME" LIKE '%沟%' AND "SmLength" IS NOT NULL AND "SmLength" != '' AND CAST("SmLength" AS FLOAT) > 0;

INSERT INTO "水系数据分类统计" ("统计类型", "数据表名", "分类关键词", "数量", "数值总计", "数值单位", "平均值")
SELECT 
    '倒水类水系线长度',
    '水系线',
    '倒水',
    COUNT(*),
    SUM(CAST("SmLength" AS FLOAT)),
    '米',
    AVG(CAST("SmLength" AS FLOAT))
FROM "水系线"
WHERE "NAME" LIKE '%倒水%' AND "SmLength" IS NOT NULL AND "SmLength" != '' AND CAST("SmLength" AS FLOAT) > 0;

INSERT INTO "水系数据分类统计" ("统计类型", "数据表名", "分类关键词", "数量", "数值总计", "数值单位", "平均值")
SELECT 
    '江类水系线长度',
    '水系线',
    '江',
    COUNT(*),
    SUM(CAST("SmLength" AS FLOAT)),
    '米',
    AVG(CAST("SmLength" AS FLOAT))
FROM "水系线"
WHERE "NAME" LIKE '%江%' AND "SmLength" IS NOT NULL AND "SmLength" != '' AND CAST("SmLength" AS FLOAT) > 0;

INSERT INTO "水系数据分类统计" ("统计类型", "数据表名", "分类关键词", "数量", "数值总计", "数值单位", "平均值")
SELECT 
    '举水类水系线长度',
    '水系线',
    '举水',
    COUNT(*),
    SUM(CAST("SmLength" AS FLOAT)),
    '米',
    AVG(CAST("SmLength" AS FLOAT))
FROM "水系线"
WHERE "NAME" LIKE '%举水%' AND "SmLength" IS NOT NULL AND "SmLength" != '' AND CAST("SmLength" AS FLOAT) > 0;

INSERT INTO "水系数据分类统计" ("统计类型", "数据表名", "分类关键词", "数量", "数值总计", "数值单位", "平均值")
SELECT 
    '干沟类水系线长度',
    '水系线',
    '干沟',
    COUNT(*),
    SUM(CAST("SmLength" AS FLOAT)),
    '米',
    AVG(CAST("SmLength" AS FLOAT))
FROM "水系线"
WHERE "NAME" LIKE '%干沟%' AND "SmLength" IS NOT NULL AND "SmLength" != '' AND CAST("SmLength" AS FLOAT) > 0;

-- ===========================================
-- 4. 横向统计查询
-- ===========================================

-- 方法3: 横向综合统计
SELECT 
    (SELECT COUNT(*) FROM "水系面" WHERE "SmPerimeter" IS NOT NULL AND "SmPerimeter" != '' AND CAST("SmPerimeter" AS FLOAT) > 0) AS 水系面总数量,
    (SELECT ROUND(CAST(SUM(CAST("SmPerimeter" AS FLOAT)) / 1000 AS NUMERIC), 2) FROM "水系面" WHERE "SmPerimeter" IS NOT NULL AND "SmPerimeter" != '' AND CAST("SmPerimeter" AS FLOAT) > 0) AS 水系面总周长公里,
    (SELECT COUNT(*) FROM "水系面" WHERE "NAME" LIKE '%湖%' AND "SmPerimeter" IS NOT NULL AND "SmPerimeter" != '' AND CAST("SmPerimeter" AS FLOAT) > 0) AS 湖类数量,
    (SELECT COUNT(*) FROM "水系面" WHERE "NAME" LIKE '%海%' AND "SmPerimeter" IS NOT NULL AND "SmPerimeter" != '' AND CAST("SmPerimeter" AS FLOAT) > 0) AS 海类数量,
    (SELECT COUNT(*) FROM "水系面" WHERE "NAME" LIKE '%港%' AND "SmPerimeter" IS NOT NULL AND "SmPerimeter" != '' AND CAST("SmPerimeter" AS FLOAT) > 0) AS 港类数量,
    (SELECT COUNT(*) FROM "水系面" WHERE "NAME" LIKE '%水库%' AND "SmPerimeter" IS NOT NULL AND "SmPerimeter" != '' AND CAST("SmPerimeter" AS FLOAT) > 0) AS 水库类数量,
    (SELECT COUNT(*) FROM "水系线" WHERE "SmLength" IS NOT NULL AND "SmLength" != '' AND CAST("SmLength" AS FLOAT) > 0) AS 水系线总数量,
    (SELECT ROUND(CAST(SUM(CAST("SmLength" AS FLOAT)) / 1000 AS NUMERIC), 2) FROM "水系线" WHERE "SmLength" IS NOT NULL AND "SmLength" != '' AND CAST("SmLength" AS FLOAT) > 0) AS 水系线总长度公里,
    (SELECT COUNT(*) FROM "水系线" WHERE "NAME" LIKE '%干渠%' AND "SmLength" IS NOT NULL AND "SmLength" != '' AND CAST("SmLength" AS FLOAT) > 0) AS 干渠类数量,
    (SELECT COUNT(*) FROM "水系线" WHERE "NAME" LIKE '%河%' AND "SmLength" IS NOT NULL AND "SmLength" != '' AND CAST("SmLength" AS FLOAT) > 0) AS 河类数量,
    (SELECT COUNT(*) FROM "水系线" WHERE "NAME" LIKE '%沟%' AND "SmLength" IS NOT NULL AND "SmLength" != '' AND CAST("SmLength" AS FLOAT) > 0) AS 沟类数量,
    (SELECT COUNT(*) FROM "水系线" WHERE "NAME" LIKE '%江%' AND "SmLength" IS NOT NULL AND "SmLength" != '' AND CAST("SmLength" AS FLOAT) > 0) AS 江类数量;

-- ===========================================
-- 5. 创建统计视图
-- ===========================================

-- 创建分类统计视图
CREATE OR REPLACE VIEW "水系数据分类统计视图" AS
SELECT 
    "统计类型",
    "数据表名",
    "分类关键词",
    "数量",
    CASE 
        WHEN "数值单位" = '米' AND "数值总计" IS NOT NULL THEN ROUND(CAST("数值总计" / 1000 AS NUMERIC), 2)
        ELSE "数值总计"
    END AS 换算后数值,
    CASE 
        WHEN "数值单位" = '米' THEN '公里'
        ELSE "数值单位"
    END AS 换算单位,
    "平均值",
    "创建时间"
FROM "水系数据分类统计";

-- 查询分类统计结果
SELECT * FROM "水系数据分类统计视图" ORDER BY "数据表名", "分类关键词";

-- ===========================================
-- 6. 最终汇总结果
-- ===========================================

-- ===========================================
-- 7. 查询新创建的统计表格
-- ===========================================

-- 查询水系面分类统计表
SELECT '水系面分类统计表' AS 表格名称;
SELECT * FROM "水系面分类统计表" ORDER BY "分类关键词";

-- 查询水系线分类统计表
SELECT '水系线分类统计表' AS 表格名称;
SELECT * FROM "水系线分类统计表" ORDER BY "分类关键词";

-- 查询综合统计表
SELECT '水系数据分类统计表' AS 表格名称;
SELECT * FROM "水系数据分类统计" ORDER BY "数据表名", "分类关键词";

-- 查询最终汇总结果
SELECT 
    '水系数据分类统计汇总' AS 报告标题,
    (SELECT COUNT(*) FROM "水系面" WHERE "SmPerimeter" IS NOT NULL AND "SmPerimeter" != '' AND CAST("SmPerimeter" AS FLOAT) > 0) AS 水系面要素数量,
    (SELECT COUNT(*) FROM "水系线" WHERE "SmLength" IS NOT NULL AND "SmLength" != '' AND CAST("SmLength" AS FLOAT) > 0) AS 水系线要素数量,
    (SELECT ROUND(CAST(SUM(CAST("SmPerimeter" AS FLOAT)) / 1000 AS NUMERIC), 2) FROM "水系面" WHERE "SmPerimeter" IS NOT NULL AND "SmPerimeter" != '' AND CAST("SmPerimeter" AS FLOAT) > 0) AS 水系面总周长公里,
    (SELECT ROUND(CAST(SUM(CAST("SmLength" AS FLOAT)) / 1000 AS NUMERIC), 2) FROM "水系线" WHERE "SmLength" IS NOT NULL AND "SmLength" != '' AND CAST("SmLength" AS FLOAT) > 0) AS 水系线总长度公里;
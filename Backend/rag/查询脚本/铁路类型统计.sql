-- 铁路类型长度统计查询
-- 基于TYPE字段进行分组统计

-- 方法1: 使用子查询创建统计汇总
SELECT 
    '总长度' AS 统计类型,
    SUM(CAST("SmLength" AS FLOAT)) AS 长度总计
FROM "铁路"
WHERE "SmLength" IS NOT NULL AND "SmLength" != '' AND CAST("SmLength" AS FLOAT) > 0

UNION ALL

SELECT 
    '高铁' AS 统计类型,
    SUM(CAST("SmLength" AS FLOAT)) AS 长度总计
FROM "铁路" 
WHERE "TYPE" = '高铁' AND "SmLength" IS NOT NULL AND "SmLength" != '' AND CAST("SmLength" AS FLOAT) > 0

UNION ALL

SELECT 
    '高铁/高架' AS 统计类型,
    SUM(CAST("SmLength" AS FLOAT)) AS 长度总计
FROM "铁路" 
WHERE "TYPE" = '高铁/高架' AND "SmLength" IS NOT NULL AND "SmLength" != '' AND CAST("SmLength" AS FLOAT) > 0

UNION ALL

SELECT 
    '电气化铁路' AS 统计类型,
    SUM(CAST("SmLength" AS FLOAT)) AS 长度总计
FROM "铁路" 
WHERE "TYPE" = '电' AND "SmLength" IS NOT NULL AND "SmLength" != '' AND CAST("SmLength" AS FLOAT) > 0

UNION ALL

SELECT 
    'NULL类型' AS 统计类型,
    SUM(CAST("SmLength" AS FLOAT)) AS 长度总计
FROM "铁路" 
WHERE "TYPE" IS NULL OR "TYPE" = 'NULL' AND "SmLength" IS NOT NULL AND "SmLength" != '' AND CAST("SmLength" AS FLOAT) > 0

ORDER BY 统计类型;

-- 方法2: 创建统计表并插入结果
CREATE TABLE IF NOT EXISTS "铁路类型统计" (
    "统计类型" VARCHAR(20) PRIMARY KEY,
    "长度总计" FLOAT,
    "记录数量" INTEGER,
    "创建时间" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 清空现有数据
DELETE FROM "铁路类型统计";

-- 插入统计结果
INSERT INTO "铁路类型统计" ("统计类型", "长度总计", "记录数量")
SELECT 
    '总长度',
    SUM(CAST("SmLength" AS FLOAT)),
    COUNT(*)
FROM "铁路"
WHERE "SmLength" IS NOT NULL AND "SmLength" != '' AND CAST("SmLength" AS FLOAT) > 0;

INSERT INTO "铁路类型统计" ("统计类型", "长度总计", "记录数量")
SELECT 
    '高铁',
    SUM(CAST("SmLength" AS FLOAT)),
    COUNT(*)
FROM "铁路" 
WHERE "TYPE" = '高铁' AND "SmLength" IS NOT NULL AND "SmLength" != '' AND CAST("SmLength" AS FLOAT) > 0;

INSERT INTO "铁路类型统计" ("统计类型", "长度总计", "记录数量")
SELECT 
    '高铁/高架',
    SUM(CAST("SmLength" AS FLOAT)),
    COUNT(*)
FROM "铁路" 
WHERE "TYPE" = '高铁/高架' AND "SmLength" IS NOT NULL AND "SmLength" != '' AND CAST("SmLength" AS FLOAT) > 0;

INSERT INTO "铁路类型统计" ("统计类型", "长度总计", "记录数量")
SELECT 
    '电气化铁路',
    SUM(CAST("SmLength" AS FLOAT)),
    COUNT(*)
FROM "铁路" 
WHERE "TYPE" = '电' AND "SmLength" IS NOT NULL AND "SmLength" != '' AND CAST("SmLength" AS FLOAT) > 0;

INSERT INTO "铁路类型统计" ("统计类型", "长度总计", "记录数量")
SELECT 
    'NULL类型',
    SUM(CAST("SmLength" AS FLOAT)),
    COUNT(*)
FROM "铁路" 
WHERE ("TYPE" IS NULL OR "TYPE" = 'NULL') AND "SmLength" IS NOT NULL AND "SmLength" != '' AND CAST("SmLength" AS FLOAT) > 0;

-- 查询统计结果
SELECT * FROM "铁路类型统计" ORDER BY "统计类型";

-- 方法3: 使用CASE WHEN创建横向统计
SELECT 
    SUM(CAST("SmLength" AS FLOAT)) AS 总长度,
    SUM(CASE WHEN "TYPE" = '高铁' THEN CAST("SmLength" AS FLOAT) ELSE 0 END) AS 高铁长度,
    SUM(CASE WHEN "TYPE" = '高铁/高架' THEN CAST("SmLength" AS FLOAT) ELSE 0 END) AS 高铁高架长度,
    SUM(CASE WHEN "TYPE" = '电' THEN CAST("SmLength" AS FLOAT) ELSE 0 END) AS 电气化铁路长度,
    SUM(CASE WHEN "TYPE" IS NULL OR "TYPE" = 'NULL' THEN CAST("SmLength" AS FLOAT) ELSE 0 END) AS NULL类型长度,
    COUNT(*) AS 总记录数,
    COUNT(CASE WHEN "TYPE" = '高铁' THEN 1 END) AS 高铁数量,
    COUNT(CASE WHEN "TYPE" = '高铁/高架' THEN 1 END) AS 高铁高架数量,
    COUNT(CASE WHEN "TYPE" = '电' THEN 1 END) AS 电气化铁路数量,
    COUNT(CASE WHEN "TYPE" IS NULL OR "TYPE" = 'NULL' THEN 1 END) AS NULL类型数量
FROM "铁路"
WHERE "SmLength" IS NOT NULL AND "SmLength" != '' AND CAST("SmLength" AS FLOAT) > 0;

-- 方法4: 创建视图便于后续查询
CREATE OR REPLACE VIEW "铁路类型统计视图" AS
SELECT 
    "统计类型",
    "长度总计",
    "记录数量",
    ROUND("长度总计" / 1000, 2) AS 长度公里,
    ROUND("长度总计" / (SELECT SUM(CAST("SmLength" AS FLOAT)) FROM "铁路" WHERE "SmLength" IS NOT NULL AND "SmLength" != '' AND CAST("SmLength" AS FLOAT) > 0) * 100, 2) AS 占比百分比
FROM "铁路类型统计";

-- 查询视图结果
SELECT * FROM "铁路类型统计视图" ORDER BY "长度总计" DESC;

-- 方法5: 动态获取所有TYPE类型并统计
SELECT 
    "TYPE" AS 铁路类型,
    SUM(CAST("SmLength" AS FLOAT)) AS 长度总计,
    COUNT(*) AS 记录数量,
    ROUND(SUM(CAST("SmLength" AS FLOAT)) / 1000, 2) AS 长度公里,
    ROUND(SUM(CAST("SmLength" AS FLOAT)) / (SELECT SUM(CAST("SmLength" AS FLOAT)) FROM "铁路" WHERE "SmLength" IS NOT NULL AND "SmLength" != '' AND CAST("SmLength" AS FLOAT) > 0) * 100, 2) AS 占比百分比
FROM "铁路"
WHERE "SmLength" IS NOT NULL AND "SmLength" != '' AND CAST("SmLength" AS FLOAT) > 0
GROUP BY "TYPE"
ORDER BY 长度总计 DESC;

-- 方法6: 包含NULL值的完整统计
SELECT 
    COALESCE("TYPE", 'NULL类型') AS 铁路类型,
    SUM(CAST("SmLength" AS FLOAT)) AS 长度总计,
    COUNT(*) AS 记录数量,
    ROUND(SUM(CAST("SmLength" AS FLOAT)) / 1000, 2) AS 长度公里
FROM "铁路"
WHERE "SmLength" IS NOT NULL AND "SmLength" != '' AND CAST("SmLength" AS FLOAT) > 0
GROUP BY "TYPE"
ORDER BY 长度总计 DESC;

-- 公路等级长度统计查询
-- 基于用户提供的查询语句，创建综合统计结果

-- 方法1: 使用子查询创建统计汇总
SELECT 
    '总长度' AS 统计类型,
    SUM(CAST("SmLength" AS FLOAT)) AS 长度总计
FROM "公路"
WHERE "SmLength" IS NOT NULL AND "SmLength" != ''

UNION ALL

SELECT 
    '一级公路' AS 统计类型,
    SUM(CAST("SmLength" AS FLOAT)) AS 长度总计
FROM "公路" 
WHERE "RTEG" = '一级' AND "SmLength" IS NOT NULL AND "SmLength" != ''

UNION ALL

SELECT 
    '二级公路' AS 统计类型,
    SUM(CAST("SmLength" AS FLOAT)) AS 长度总计
FROM "公路" 
WHERE "RTEG" = '二级' AND "SmLength" IS NOT NULL AND "SmLength" != ''

UNION ALL

SELECT 
    '三级公路' AS 统计类型,
    SUM(CAST("SmLength" AS FLOAT)) AS 长度总计
FROM "公路" 
WHERE "RTEG" = '三级' AND "SmLength" IS NOT NULL AND "SmLength" != ''

UNION ALL

SELECT 
    '四级公路' AS 统计类型,
    SUM(CAST("SmLength" AS FLOAT)) AS 长度总计
FROM "公路" 
WHERE "RTEG" = '四级' AND "SmLength" IS NOT NULL AND "SmLength" != ''

UNION ALL

SELECT 
    'NULL等级' AS 统计类型,
    SUM(CAST("SmLength" AS FLOAT)) AS 长度总计
FROM "公路" 
WHERE "RTEG" IS NULL OR "RTEG" = 'NULL' AND "SmLength" IS NOT NULL AND "SmLength" != ''

ORDER BY 统计类型;

-- 方法2: 创建统计表并插入结果
CREATE TABLE IF NOT EXISTS "公路等级统计" (
    "统计类型" VARCHAR(20) PRIMARY KEY,
    "长度总计" FLOAT,
    "记录数量" INTEGER,
    "创建时间" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 清空现有数据
DELETE FROM "公路等级统计";

-- 插入统计结果
INSERT INTO "公路等级统计" ("统计类型", "长度总计", "记录数量")
SELECT 
    '总长度',
    SUM(CAST("SmLength" AS FLOAT)),
    COUNT(*)
FROM "公路"
WHERE "SmLength" IS NOT NULL AND "SmLength" != '';

INSERT INTO "公路等级统计" ("统计类型", "长度总计", "记录数量")
SELECT 
    '一级公路',
    SUM(CAST("SmLength" AS FLOAT)),
    COUNT(*)
FROM "公路" 
WHERE "RTEG" = '一级' AND "SmLength" IS NOT NULL AND "SmLength" != '';

INSERT INTO "公路等级统计" ("统计类型", "长度总计", "记录数量")
SELECT 
    '二级公路',
    SUM(CAST("SmLength" AS FLOAT)),
    COUNT(*)
FROM "公路" 
WHERE "RTEG" = '二级' AND "SmLength" IS NOT NULL AND "SmLength" != '';

INSERT INTO "公路等级统计" ("统计类型", "长度总计", "记录数量")
SELECT 
    '三级公路',
    SUM(CAST("SmLength" AS FLOAT)),
    COUNT(*)
FROM "公路" 
WHERE "RTEG" = '三级' AND "SmLength" IS NOT NULL AND "SmLength" != '';

INSERT INTO "公路等级统计" ("统计类型", "长度总计", "记录数量")
SELECT 
    '四级公路',
    SUM(CAST("SmLength" AS FLOAT)),
    COUNT(*)
FROM "公路" 
WHERE "RTEG" = '四级' AND "SmLength" IS NOT NULL AND "SmLength" != '';

INSERT INTO "公路等级统计" ("统计类型", "长度总计", "记录数量")
SELECT 
    'NULL等级',
    SUM(CAST("SmLength" AS FLOAT)),
    COUNT(*)
FROM "公路" 
WHERE ("RTEG" IS NULL OR "RTEG" = 'NULL') AND "SmLength" IS NOT NULL AND "SmLength" != '';

-- 查询统计结果
SELECT * FROM "公路等级统计" ORDER BY "统计类型";

-- 方法3: 使用CASE WHEN创建横向统计
SELECT 
    SUM(CAST("SmLength" AS FLOAT)) AS 总长度,
    SUM(CASE WHEN "RTEG" = '一级' THEN CAST("SmLength" AS FLOAT) ELSE 0 END) AS 一级公路长度,
    SUM(CASE WHEN "RTEG" = '二级' THEN CAST("SmLength" AS FLOAT) ELSE 0 END) AS 二级公路长度,
    SUM(CASE WHEN "RTEG" = '三级' THEN CAST("SmLength" AS FLOAT) ELSE 0 END) AS 三级公路长度,
    SUM(CASE WHEN "RTEG" = '四级' THEN CAST("SmLength" AS FLOAT) ELSE 0 END) AS 四级公路长度,
    SUM(CASE WHEN "RTEG" IS NULL OR "RTEG" = 'NULL' THEN CAST("SmLength" AS FLOAT) ELSE 0 END) AS NULL等级长度,
    COUNT(*) AS 总记录数,
    COUNT(CASE WHEN "RTEG" = '一级' THEN 1 END) AS 一级公路数量,
    COUNT(CASE WHEN "RTEG" = '二级' THEN 1 END) AS 二级公路数量,
    COUNT(CASE WHEN "RTEG" = '三级' THEN 1 END) AS 三级公路数量,
    COUNT(CASE WHEN "RTEG" = '四级' THEN 1 END) AS 四级公路数量,
    COUNT(CASE WHEN "RTEG" IS NULL OR "RTEG" = 'NULL' THEN 1 END) AS NULL等级数量
FROM "公路"
WHERE "SmLength" IS NOT NULL AND "SmLength" != '';

-- 方法4: 创建视图便于后续查询
CREATE OR REPLACE VIEW "公路等级统计视图" AS
SELECT 
    "统计类型",
    "长度总计",
    "记录数量",
    ROUND("长度总计" / 1000, 2) AS 长度公里,
    ROUND("长度总计" / (SELECT SUM(CAST("SmLength" AS FLOAT)) FROM "公路" WHERE "SmLength" IS NOT NULL AND "SmLength" != '') * 100, 2) AS 占比百分比
FROM "公路等级统计";

-- 查询视图结果
SELECT * FROM "公路等级统计视图" ORDER BY "长度总计" DESC;

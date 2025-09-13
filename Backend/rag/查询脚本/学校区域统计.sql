-- 学校区域统计查询
-- 基于NAME_First字段进行分组统计

-- 方法1: 使用子查询创建统计汇总
SELECT 
    '学校总数量' AS 统计类型,
    COUNT(*) AS 数量
FROM "学校"

UNION ALL

SELECT 
    '洪山区学校' AS 统计类型,
    COUNT(*) AS 数量
FROM "学校" 
WHERE "NAME_First" = '洪山区'

UNION ALL

SELECT 
    '江岸区学校' AS 统计类型,
    COUNT(*) AS 数量
FROM "学校" 
WHERE "NAME_First" = '江岸区'

UNION ALL

SELECT 
    '江汉区学校' AS 统计类型,
    COUNT(*) AS 数量
FROM "学校" 
WHERE "NAME_First" = '江汉区'

UNION ALL

SELECT 
    '硚口区学校' AS 统计类型,
    COUNT(*) AS 数量
FROM "学校" 
WHERE "NAME_First" = '硚口区'

UNION ALL

SELECT 
    '汉阳区学校' AS 统计类型,
    COUNT(*) AS 数量
FROM "学校" 
WHERE "NAME_First" = '汉阳区'

UNION ALL

SELECT 
    '武昌区学校' AS 统计类型,
    COUNT(*) AS 数量
FROM "学校" 
WHERE "NAME_First" = '武昌区'

UNION ALL

SELECT 
    '青山区学校' AS 统计类型,
    COUNT(*) AS 数量
FROM "学校" 
WHERE "NAME_First" = '青山区'

UNION ALL

SELECT 
    '东西湖区学校' AS 统计类型,
    COUNT(*) AS 数量
FROM "学校" 
WHERE "NAME_First" = '东西湖区'

UNION ALL

SELECT 
    '汉南区学校' AS 统计类型,
    COUNT(*) AS 数量
FROM "学校" 
WHERE "NAME_First" = '汉南区'

UNION ALL

SELECT 
    '蔡甸区学校' AS 统计类型,
    COUNT(*) AS 数量
FROM "学校" 
WHERE "NAME_First" = '蔡甸区'

UNION ALL

SELECT 
    '江夏区学校' AS 统计类型,
    COUNT(*) AS 数量
FROM "学校" 
WHERE "NAME_First" = '江夏区'

UNION ALL

SELECT 
    '黄陂区学校' AS 统计类型,
    COUNT(*) AS 数量
FROM "学校" 
WHERE "NAME_First" = '黄陂区'

UNION ALL

SELECT 
    '新洲区学校' AS 统计类型,
    COUNT(*) AS 数量
FROM "学校" 
WHERE "NAME_First" = '新洲区'

UNION ALL

SELECT 
    'NULL区域学校' AS 统计类型,
    COUNT(*) AS 数量
FROM "学校" 
WHERE "NAME_First" IS NULL OR "NAME_First" = 'NULL'

ORDER BY 统计类型;

-- 方法2: 创建统计表并插入结果
CREATE TABLE IF NOT EXISTS "学校区域统计" (
    "统计类型" VARCHAR(20) PRIMARY KEY,
    "区域名称" VARCHAR(20),
    "学校数量" INTEGER,
    "创建时间" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 清空现有数据
DELETE FROM "学校区域统计";

-- 插入统计结果
INSERT INTO "学校区域统计" ("统计类型", "区域名称", "学校数量")
SELECT 
    '学校总数量',
    '全部',
    COUNT(*)
FROM "学校";

INSERT INTO "学校区域统计" ("统计类型", "区域名称", "学校数量")
SELECT 
    '洪山区学校',
    '洪山区',
    COUNT(*)
FROM "学校" 
WHERE "NAME_First" = '洪山区';

INSERT INTO "学校区域统计" ("统计类型", "区域名称", "学校数量")
SELECT 
    '江岸区学校',
    '江岸区',
    COUNT(*)
FROM "学校" 
WHERE "NAME_First" = '江岸区';

INSERT INTO "学校区域统计" ("统计类型", "区域名称", "学校数量")
SELECT 
    '江汉区学校',
    '江汉区',
    COUNT(*)
FROM "学校" 
WHERE "NAME_First" = '江汉区';

INSERT INTO "学校区域统计" ("统计类型", "区域名称", "学校数量")
SELECT 
    '硚口区学校',
    '硚口区',
    COUNT(*)
FROM "学校" 
WHERE "NAME_First" = '硚口区';

INSERT INTO "学校区域统计" ("统计类型", "区域名称", "学校数量")
SELECT 
    '汉阳区学校',
    '汉阳区',
    COUNT(*)
FROM "学校" 
WHERE "NAME_First" = '汉阳区';

INSERT INTO "学校区域统计" ("统计类型", "区域名称", "学校数量")
SELECT 
    '武昌区学校',
    '武昌区',
    COUNT(*)
FROM "学校" 
WHERE "NAME_First" = '武昌区';

INSERT INTO "学校区域统计" ("统计类型", "区域名称", "学校数量")
SELECT 
    '青山区学校',
    '青山区',
    COUNT(*)
FROM "学校" 
WHERE "NAME_First" = '青山区';

INSERT INTO "学校区域统计" ("统计类型", "区域名称", "学校数量")
SELECT 
    '东西湖区学校',
    '东西湖区',
    COUNT(*)
FROM "学校" 
WHERE "NAME_First" = '东西湖区';

INSERT INTO "学校区域统计" ("统计类型", "区域名称", "学校数量")
SELECT 
    '汉南区学校',
    '汉南区',
    COUNT(*)
FROM "学校" 
WHERE "NAME_First" = '汉南区';

INSERT INTO "学校区域统计" ("统计类型", "区域名称", "学校数量")
SELECT 
    '蔡甸区学校',
    '蔡甸区',
    COUNT(*)
FROM "学校" 
WHERE "NAME_First" = '蔡甸区';

INSERT INTO "学校区域统计" ("统计类型", "区域名称", "学校数量")
SELECT 
    '江夏区学校',
    '江夏区',
    COUNT(*)
FROM "学校" 
WHERE "NAME_First" = '江夏区';

INSERT INTO "学校区域统计" ("统计类型", "区域名称", "学校数量")
SELECT 
    '黄陂区学校',
    '黄陂区',
    COUNT(*)
FROM "学校" 
WHERE "NAME_First" = '黄陂区';

INSERT INTO "学校区域统计" ("统计类型", "区域名称", "学校数量")
SELECT 
    '新洲区学校',
    '新洲区',
    COUNT(*)
FROM "学校" 
WHERE "NAME_First" = '新洲区';

INSERT INTO "学校区域统计" ("统计类型", "区域名称", "学校数量")
SELECT 
    'NULL区域学校',
    'NULL',
    COUNT(*)
FROM "学校" 
WHERE "NAME_First" IS NULL OR "NAME_First" = 'NULL';

-- 查询统计结果
SELECT * FROM "学校区域统计" ORDER BY "学校数量" DESC;

-- 方法3: 使用CASE WHEN创建横向统计
SELECT 
    COUNT(*) AS 学校总数量,
    COUNT(CASE WHEN "NAME_First" = '洪山区' THEN 1 END) AS 洪山区学校数量,
    COUNT(CASE WHEN "NAME_First" = '江岸区' THEN 1 END) AS 江岸区学校数量,
    COUNT(CASE WHEN "NAME_First" = '江汉区' THEN 1 END) AS 江汉区学校数量,
    COUNT(CASE WHEN "NAME_First" = '硚口区' THEN 1 END) AS 硚口区学校数量,
    COUNT(CASE WHEN "NAME_First" = '汉阳区' THEN 1 END) AS 汉阳区学校数量,
    COUNT(CASE WHEN "NAME_First" = '武昌区' THEN 1 END) AS 武昌区学校数量,
    COUNT(CASE WHEN "NAME_First" = '青山区' THEN 1 END) AS 青山区学校数量,
    COUNT(CASE WHEN "NAME_First" = '东西湖区' THEN 1 END) AS 东西湖区学校数量,
    COUNT(CASE WHEN "NAME_First" = '汉南区' THEN 1 END) AS 汉南区学校数量,
    COUNT(CASE WHEN "NAME_First" = '蔡甸区' THEN 1 END) AS 蔡甸区学校数量,
    COUNT(CASE WHEN "NAME_First" = '江夏区' THEN 1 END) AS 江夏区学校数量,
    COUNT(CASE WHEN "NAME_First" = '黄陂区' THEN 1 END) AS 黄陂区学校数量,
    COUNT(CASE WHEN "NAME_First" = '新洲区' THEN 1 END) AS 新洲区学校数量,
    COUNT(CASE WHEN "NAME_First" IS NULL OR "NAME_First" = 'NULL' THEN 1 END) AS NULL区域学校数量
FROM "学校";

-- 方法4: 创建视图便于后续查询
CREATE OR REPLACE VIEW "学校区域统计视图" AS
SELECT 
    "统计类型",
    "区域名称",
    "学校数量",
    ROUND("学校数量" / (SELECT COUNT(*) FROM "学校") * 100, 2) AS 占比百分比,
    "创建时间"
FROM "学校区域统计";

-- 查询视图结果
SELECT * FROM "学校区域统计视图" ORDER BY "学校数量" DESC;

-- 方法5: 动态获取所有NAME_First类型并统计
SELECT 
    COALESCE("NAME_First", 'NULL区域') AS 区域名称,
    COUNT(*) AS 学校数量,
    ROUND(COUNT(*) / (SELECT COUNT(*) FROM "学校") * 100, 2) AS 占比百分比
FROM "学校"
GROUP BY "NAME_First"
ORDER BY 学校数量 DESC;

-- 方法6: 包含NULL值的完整统计
SELECT 
    COALESCE("NAME_First", 'NULL区域') AS 区域名称,
    COUNT(*) AS 学校数量,
    ROUND(COUNT(*) / (SELECT COUNT(*) FROM "学校") * 100, 2) AS 占比百分比
FROM "学校"
GROUP BY "NAME_First"
ORDER BY 学校数量 DESC;

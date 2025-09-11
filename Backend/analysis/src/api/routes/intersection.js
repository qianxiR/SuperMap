/**
 * 相交分析路由
 */
const express = require('express');
const router = express.Router();
const IntersectionAnalysisController = require('../controllers/IntersectionAnalysisController');
const { validateIntersectionRequest } = require('../../middleware/validation');

// 创建控制器实例
const intersectionAnalysisController = new IntersectionAnalysisController();

/**
 * @swagger
 * /api/v1/spatial-analysis/intersection:
 *   post:
 *     summary: 执行相交分析
 *     description: 计算两个图层之间的几何相交关系，返回相交区域
 *     tags: [Intersection Analysis]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/IntersectionAnalysisRequest'
 *           examples:
 *             example1:
 *               summary: 多边形相交分析示例
 *               value:
 *                 targetData:
 *                   type: "FeatureCollection"
 *                   features:
 *                     - type: "Feature"
 *                       geometry:
 *                         type: "Polygon"
 *                         coordinates: [[[114.1, 30.1], [114.2, 30.1], [114.2, 30.2], [114.1, 30.2], [114.1, 30.1]]]
 *                       properties:
 *                         name: "目标区域"
 *                 maskData:
 *                   type: "FeatureCollection"
 *                   features:
 *                     - type: "Feature"
 *                       geometry:
 *                         type: "Polygon"
 *                         coordinates: [[[114.15, 30.15], [114.25, 30.15], [114.25, 30.25], [114.15, 30.25], [114.15, 30.15]]]
 *                       properties:
 *                         name: "裁剪区域"
 *                 analysisOptions:
 *                   batchSize: 100
 *                   enableProgress: true
 *                   returnGeometry: true
 *                 options:
 *                   resultLayerName: "相交分析测试"
 *     responses:
 *       200:
 *         description: 相交分析执行成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/IntersectionAnalysisResponse'
 *             examples:
 *               success:
 *                 summary: 成功响应示例
 *                 value:
 *                   success: true
 *                   data:
 *                     id: "intersection_123"
 *                     name: "相交分析结果"
 *                     results:
 *                       - id: "intersection_0_0_1234567890"
 *                         name: "相交区域 1"
 *                         geometry:
 *                           type: "Polygon"
 *                           coordinates: [[[114.15, 30.15], [114.2, 30.15], [114.2, 30.2], [114.15, 30.2], [114.15, 30.15]]]
 *                     statistics:
 *                       totalResults: 1
 *                       targetFeatureCount: 1
 *                       maskFeatureCount: 1
 *                       totalPairs: 1
 *                       successRate: 100
 *                     metadata:
 *                       version: "1.0.0"
 *                       algorithm: "turf-intersect"
 *                       coordinateSystem: "EPSG:4326"
 *                   message: "相交分析执行成功"
 *       400:
 *         description: 请求参数错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: 服务器内部错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/', validateIntersectionRequest, async (req, res) => {
  await intersectionAnalysisController.executeIntersectionAnalysis(req, res);
});

module.exports = router;

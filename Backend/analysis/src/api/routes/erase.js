/**
 * 擦除分析路由
 */
const express = require('express');
const router = express.Router();
const EraseAnalysisController = require('../controllers/EraseAnalysisController');
const { validateEraseRequest } = require('../../middleware/validation');

// 创建控制器实例
const eraseAnalysisController = new EraseAnalysisController();

/**
 * @swagger
 * /api/v1/spatial-analysis/erase:
 *   post:
 *     summary: 执行擦除分析
 *     description: 计算目标图层与擦除图层之间的几何差集关系，返回擦除后的区域
 *     tags: [Erase Analysis]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/EraseAnalysisRequest'
 *           examples:
 *             example1:
 *               summary: 多边形擦除分析示例
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
 *                 eraseData:
 *                   type: "FeatureCollection"
 *                   features:
 *                     - type: "Feature"
 *                       geometry:
 *                         type: "Polygon"
 *                         coordinates: [[[114.15, 30.15], [114.25, 30.15], [114.25, 30.25], [114.15, 30.25], [114.15, 30.15]]]
 *                       properties:
 *                         name: "擦除区域"
 *                 analysisOptions:
 *                   batchSize: 100
 *                   enableProgress: true
 *                   returnGeometry: true
 *                 options:
 *                   resultLayerName: "擦除分析测试"
 *     responses:
 *       200:
 *         description: 擦除分析执行成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EraseAnalysisResponse'
 *             examples:
 *               success:
 *                 summary: 成功响应示例
 *                 value:
 *                   success: true
 *                   data:
 *                     id: "erase_123"
 *                     name: "擦除分析结果"
 *                     results:
 *                       - id: "erase_0_0_1234567890"
 *                         name: "擦除区域 1"
 *                         geometry:
 *                           type: "Polygon"
 *                           coordinates: [[[114.1, 30.1], [114.15, 30.1], [114.15, 30.15], [114.1, 30.15], [114.1, 30.1]]]
 *                     statistics:
 *                       totalResults: 1
 *                       targetFeatureCount: 1
 *                       eraseFeatureCount: 1
 *                       totalPairs: 1
 *                       successRate: 100
 *                     metadata:
 *                       version: "1.0.0"
 *                       algorithm: "turf-difference"
 *                       coordinateSystem: "EPSG:4326"
 *                   message: "擦除分析执行成功"
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
router.post('/', validateEraseRequest, async (req, res) => {
  await eraseAnalysisController.executeEraseAnalysis(req, res);
});

module.exports = router;

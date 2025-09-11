/**
 * 最短路径分析路由
 */
const express = require('express');
const ShortestPathAnalysisController = require('../controllers/ShortestPathAnalysisController');
const { asyncHandler } = require('../../middleware/errorHandler');
const { validateShortestPathRequest } = require('../../middleware/validation');

const router = express.Router();
const shortestPathController = new ShortestPathAnalysisController();

/**
 * @swagger
 * /api/v1/spatial-analysis/shortest-path:
 *   post:
 *     summary: 执行最短路径分析
 *     description: 计算两点间的最短路径，支持障碍物避让
 *     tags: [Shortest Path Analysis]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ShortestPathAnalysisRequest'
 *           examples:
 *             example1:
 *               summary: 武汉市内两点间最短路径示例
 *               value:
 *                 startPoint:
 *                   type: "Point"
 *                   coordinates: [114.305, 30.593]
 *                 endPoint:
 *                   type: "Point"
 *                   coordinates: [114.320, 30.610]
 *                 analysisOptions:
 *                   units: "kilometers"
 *                   resolution: 1000
 *                 options:
 *                   returnGeometry: true
 *                   calculateDistance: true
 *                   calculateDuration: true
 *                   averageSpeed: 50
 *     responses:
 *       200:
 *         description: 最短路径分析执行成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ShortestPathAnalysisResponse'
 *             examples:
 *               success:
 *                 summary: 成功响应示例
 *                 value:
 *                   success: true
 *                   data:
 *                     resultId: "shortest_path_result_2024-01-01T00:00:00-000Z"
 *                     resultName: "最短路径分析结果"
 *                     pathGeometry:
 *                       type: "LineString"
 *                       coordinates: [[114.123, 30.456], [114.234, 30.567]]
 *                     statistics:
 *                       distance: 12.34
 *                       distanceUnit: "kilometers"
 *                       duration: 14.81
 *                       durationUnit: "minutes"
 *                       complexity: 2
 *                       averageSpeed: 50
 *                       speedUnit: "km/h"
 *                     executionTime: "0.123s"
 *                   message: "最短路径分析执行成功"
 *       400:
 *         description: 请求参数错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: 图层不存在
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
router.post('/', 
  validateShortestPathRequest,
  asyncHandler(async (req, res) => {
    await shortestPathController.executeShortestPathAnalysis(req, res);
  })
);

module.exports = router;

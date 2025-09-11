/**
 * 缓冲区分析路由
 */
const express = require('express');
const BufferAnalysisController = require('../controllers/BufferAnalysisController');
const { asyncHandler } = require('../../middleware/errorHandler');
const { validateBufferRequest } = require('../../middleware/validation');

const router = express.Router();
const bufferController = new BufferAnalysisController();

/**
 * @swagger
 * /api/v1/spatial-analysis/buffer:
 *   post:
 *     summary: 执行缓冲区分析
 *     description: 对指定图层创建缓冲区，支持点、线、面要素的缓冲区分析
 *     tags: [Buffer Analysis]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BufferAnalysisRequest'
 *           examples:
 *             example1:
 *               summary: 点缓冲区分析示例（使用sourceData）
 *               value:
 *                 sourceData:
 *                   type: "FeatureCollection"
 *                   features:
 *                     - type: "Feature"
 *                       geometry:
 *                         type: "Point"
 *                         coordinates: [114.305, 30.593]
 *                       properties:
 *                         name: "武汉测试点"
 *                 bufferSettings:
 *                   radius: 1000
 *                   semicircleLineSegment: 10
 *                 options:
 *                   resultLayerName: "点缓冲区分析测试"
 *     responses:
 *       200:
 *         description: 缓冲区分析执行成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BufferAnalysisResponse'
 *             examples:
 *               success:
 *                 summary: 成功响应示例
 *                 value:
 *                   success: true
 *                   data:
 *                     resultId: "buffer_result_2024-01-01T00:00:00-000Z"
 *                     resultName: "学校缓冲区分析"
 *                     sourceLayerName: "武汉市学校"
 *                     statistics:
 *                       inputFeatureCount: 2
 *                       outputFeatureCount: 2
 *                       totalArea: 6283185.31
 *                       areaUnit: "square_meters"
 *                     executionTime: "0.123s"
 *                   message: "缓冲区分析执行成功"
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
  validateBufferRequest,
  asyncHandler(async (req, res) => {
    await bufferController.executeBufferAnalysis(req, res);
  })
);

module.exports = router;

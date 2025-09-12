const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

// GET /download/:filename - 下载分析结果文件
router.get('/:filename', (req, res, next) => {
  const { filename } = req.params;

  // 安全性校验：防止路径遍历攻击
  if (!filename || filename.includes('..')) {
    return res.status(400).json({ success: false, error: { code: 'INVALID_PARAMETER', message: '无效的文件名' } });
  }

  const downloadsDir = path.join(__dirname, '..', '..', '..', 'downloads');
  const filePath = path.join(downloadsDir, filename);

  // 检查文件是否存在
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      console.error('请求下载的文件不存在:', filePath);
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '文件未找到' } });
    }

    // 使用 res.download() 方法触发浏览器下载
    // 该方法会自动设置 Content-Disposition: attachment; filename="..." 响应头
    res.download(filePath, filename, (downloadErr) => {
      if (downloadErr) {
        // 如果在文件传输过程中发生错误，记录错误并传递给错误处理中间件
        console.error('文件下载过程中发生错误:', downloadErr);
        next(downloadErr);
      }
    });
  });
});

module.exports = router;

















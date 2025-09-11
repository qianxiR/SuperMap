/**
 * 错误处理中间件
 */

/**
 * 全局错误处理器
 * 
 * 输入数据格式：
 * Express错误对象和请求对象
 * 
 * 数据处理方法：
 * 1. 根据错误类型设置HTTP状态码
 * 2. 格式化错误响应
 * 3. 记录错误日志
 * 
 * 输出数据格式：
 * 标准化的错误响应JSON
 */
const errorHandler = (err, req, res, next) => {
  console.error('🚨 服务器错误:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  // 默认错误响应
  let statusCode = 500;
  let errorCode = 'INTERNAL_SERVER_ERROR';
  let message = '服务器内部错误';

  // 根据错误类型设置响应
  if (err.name === 'ValidationError') {
    statusCode = 400;
    errorCode = 'INVALID_PARAMETER';
    message = err.message;
  } else if (err.name === 'CastError') {
    statusCode = 400;
    errorCode = 'INVALID_PARAMETER';
    message = '参数格式错误';
  } else if (err.code === 'LIMIT_FILE_SIZE') {
    statusCode = 413;
    errorCode = 'PAYLOAD_TOO_LARGE';
    message = '请求数据过大';
  } else if (err.statusCode) {
    statusCode = err.statusCode;
    errorCode = err.code || 'CUSTOM_ERROR';
    message = err.message;
  }

  res.status(statusCode).json({
    success: false,
    error: {
      code: errorCode,
      message: message,
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    },
    timestamp: new Date().toISOString(),
    requestId: req.requestId || 'unknown'
  });
};

/**
 * 异步错误捕获包装器
 * 
 * 输入数据格式：
 * 异步函数
 * 
 * 数据处理方法：
 * 捕获异步函数中的错误并传递给错误处理中间件
 * 
 * 输出数据格式：
 * 包装后的异步函数
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = {
  errorHandler,
  asyncHandler
};


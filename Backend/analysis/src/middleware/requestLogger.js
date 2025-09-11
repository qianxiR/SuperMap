/**
 * 请求日志中间件
 */

/**
 * 请求日志记录器
 * 
 * 输入数据格式：
 * Express请求对象
 * 
 * 数据处理方法：
 * 1. 生成唯一请求ID
 * 2. 记录请求开始时间
 * 3. 添加请求ID到响应头
 * 
 * 输出数据格式：
 * 增强的请求对象
 */
const requestLogger = (req, res, next) => {
  // 生成请求ID
  req.requestId = generateRequestId();
  
  // 记录请求开始时间
  req.startTime = Date.now();
  
  // 添加请求ID到响应头
  res.setHeader('X-Request-ID', req.requestId);
  
  // 记录请求信息
  console.log(`📝 [${req.requestId}] ${req.method} ${req.url} - ${new Date().toISOString()}`);
  
  // 监听响应完成事件
  res.on('finish', () => {
    const duration = Date.now() - req.startTime;
    console.log(`✅ [${req.requestId}] ${req.method} ${req.url} - ${res.statusCode} - ${duration}ms`);
  });
  
  next();
};

/**
 * 生成请求ID
 * 
 * 输入数据格式：
 * 无
 * 
 * 数据处理方法：
 * 使用时间戳和随机数生成唯一ID
 * 
 * 输出数据格式：
 * 字符串格式的请求ID
 */
const generateRequestId = () => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 5);
  return `${timestamp}-${random}`;
};

module.exports = {
  requestLogger
};


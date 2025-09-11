/**
 * 请求验证中间件
 */
const Joi = require('joi');

/**
 * 缓冲区分析请求验证
 * 
 * 输入数据格式：
 * Express请求对象
 * 
 * 数据处理方法：
 * 1. 定义验证模式
 * 2. 验证请求数据
 * 3. 处理验证错误
 * 
 * 输出数据格式：
 * 验证通过的请求对象
 */
const validateBufferRequest = (req, res, next) => {
  // 直接使用请求体数据，不进行JSON字符串解析
  console.log('接收到的请求体:', JSON.stringify(req.body, null, 2));
  const bufferRequestSchema = Joi.object({
    sourceData: Joi.object({
      type: Joi.string().valid('Feature', 'FeatureCollection').required(),
      features: Joi.when('type', {
        is: 'FeatureCollection',
        then: Joi.array().items(Joi.object({
          type: Joi.string().valid('Feature').required(),
          geometry: Joi.object({
            type: Joi.string().required(),
            coordinates: Joi.any().required()
          }).required(),
          properties: Joi.object().optional()
        })).min(1).required(),
        otherwise: Joi.forbidden()
      }),
      geometry: Joi.when('type', {
        is: 'Feature',
        then: Joi.object({
          type: Joi.string().required(),
          coordinates: Joi.any().required()
        }).required(),
        otherwise: Joi.forbidden()
      }),
      properties: Joi.when('type', {
        is: 'Feature',
        then: Joi.object().optional(),
        otherwise: Joi.forbidden()
      })
    }).required().messages({
      'object.base': 'sourceData必须是有效的GeoJSON对象',
      'any.required': 'sourceData是必需字段'
    }),
    
    bufferSettings: Joi.object({
      radius: Joi.number().positive().required().messages({
        'number.positive': '缓冲距离必须为正数',
        'any.required': '缓冲距离是必需字段'
      }),
      semicircleLineSegment: Joi.number().integer().min(1).max(64).default(10)
    }).required().messages({
      'object.base': 'bufferSettings必须是对象',
      'any.required': 'bufferSettings是必需字段'
    }),
    
    featureFilter: Joi.object({
      featureIds: Joi.array().items(Joi.string()).optional(),
      spatialFilter: Joi.object({
        bounds: Joi.array().items(Joi.number()).length(4).optional()
      }).optional()
    }).optional(),
    
    options: Joi.object({
      returnGeometry: Joi.boolean().default(true),
      returnProperties: Joi.boolean().default(true),
      resultLayerName: Joi.string().optional()
    }).optional()
  });

  const { error, value } = bufferRequestSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });


  if (error) {
    const errorMessages = error.details.map(detail => detail.message);
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: '请求参数验证失败',
        details: errorMessages
      },
      timestamp: new Date().toISOString()
    });
  }

  // 将验证后的数据赋值给请求体
  req.body = value;
  next();
};

/**
 * 相交分析请求验证
 * 
 * 输入数据格式：
 * Express请求对象
 * 
 * 数据处理方法：
 * 验证相交分析请求参数
 * 
 * 输出数据格式：
 * 验证通过的请求对象
 */
const validateIntersectionRequest = (req, res, next) => {
  console.log('接收到的相交分析请求体:', JSON.stringify(req.body, null, 2));
  const intersectionRequestSchema = Joi.object({
    targetData: Joi.object({
      type: Joi.string().valid('FeatureCollection').required(),
      features: Joi.array().items(Joi.object({
        type: Joi.string().valid('Feature').required(),
        geometry: Joi.object({
          type: Joi.string().required(),
          coordinates: Joi.any().required()
        }).required(),
        properties: Joi.object().optional()
      })).min(1).required()
    }).required(),
    
    maskData: Joi.object({
      type: Joi.string().valid('FeatureCollection').required(),
      features: Joi.array().items(Joi.object({
        type: Joi.string().valid('Feature').required(),
        geometry: Joi.object({
          type: Joi.string().required(),
          coordinates: Joi.any().required()
        }).required(),
        properties: Joi.object().optional()
      })).min(1).required()
    }).required(),
    
    analysisOptions: Joi.object({
      batchSize: Joi.number().integer().min(10).max(1000).default(100),
      enableProgress: Joi.boolean().default(true),
      returnGeometry: Joi.boolean().default(true)
    }).optional(),
    
    options: Joi.object({
      resultLayerName: Joi.string().optional(),
      enableStatistics: Joi.boolean().default(true),
      coordinateSystem: Joi.string().default('EPSG:4326')
    }).optional()
  });

  const { error, value } = intersectionRequestSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const errorMessages = error.details.map(detail => detail.message);
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: '请求参数验证失败',
        details: errorMessages
      },
      timestamp: new Date().toISOString()
    });
  }

  req.body = value;
  next();
};

/**
 * 擦除分析请求验证
 * 
 * 输入数据格式：
 * Express请求对象
 * 
 * 数据处理方法：
 * 验证擦除分析请求参数
 * 
 * 输出数据格式：
 * 验证通过的请求对象
 */
const validateEraseRequest = (req, res, next) => {
  console.log('接收到的擦除分析请求体:', JSON.stringify(req.body, null, 2));
  const eraseRequestSchema = Joi.object({
    targetData: Joi.object({
      type: Joi.string().valid('FeatureCollection').required(),
      features: Joi.array().items(Joi.object({
        type: Joi.string().valid('Feature').required(),
        geometry: Joi.object({
          type: Joi.string().required(),
          coordinates: Joi.any().required()
        }).required(),
        properties: Joi.object().optional()
      })).min(1).required()
    }).required(),
    
    eraseData: Joi.object({
      type: Joi.string().valid('FeatureCollection').required(),
      features: Joi.array().items(Joi.object({
        type: Joi.string().valid('Feature').required(),
        geometry: Joi.object({
          type: Joi.string().required(),
          coordinates: Joi.any().required()
        }).required(),
        properties: Joi.object().optional()
      })).min(1).required()
    }).required(),
    
    analysisOptions: Joi.object({
      batchSize: Joi.number().integer().min(10).max(1000).default(100),
      enableProgress: Joi.boolean().default(true),
      returnGeometry: Joi.boolean().default(true)
    }).optional(),
    
    options: Joi.object({
      resultLayerName: Joi.string().optional(),
      enableStatistics: Joi.boolean().default(true),
      coordinateSystem: Joi.string().default('EPSG:4326')
    }).optional()
  });

  const { error, value } = eraseRequestSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const errorMessages = error.details.map(detail => detail.message);
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: '请求参数验证失败',
        details: errorMessages
      },
      timestamp: new Date().toISOString()
    });
  }

  req.body = value;
  next();
};

/**
 * 最短路径分析请求验证
 * 
 * 输入数据格式：
 * Express请求对象
 * 
 * 数据处理方法：
 * 验证最短路径分析请求参数
 * 
 * 输出数据格式：
 * 验证通过的请求对象
 */
const validateShortestPathRequest = (req, res, next) => {
  console.log('接收到的最短路径分析请求体:', JSON.stringify(req.body, null, 2));
  const shortestPathRequestSchema = Joi.object({
    startPoint: Joi.object({
      type: Joi.string().valid('Point').required(),
      coordinates: Joi.array().items(Joi.number()).length(2).required()
    }).required().messages({
      'object.base': 'startPoint必须是对象',
      'any.required': 'startPoint是必需字段'
    }),
    
    endPoint: Joi.object({
      type: Joi.string().valid('Point').required(),
      coordinates: Joi.array().items(Joi.number()).length(2).required()
    }).required().messages({
      'object.base': 'endPoint必须是对象',
      'any.required': 'endPoint是必需字段'
    }),
    
    analysisOptions: Joi.object({
      units: Joi.string().valid('kilometers', 'miles', 'meters').default('kilometers'),
      resolution: Joi.number().positive().default(1000),
      obstacleLayerId: Joi.string().optional(),
      costField: Joi.string().optional()
    }).optional(),
    
    options: Joi.object({
      returnGeometry: Joi.boolean().default(true),
      calculateDistance: Joi.boolean().default(true),
      calculateDuration: Joi.boolean().default(true),
      averageSpeed: Joi.number().positive().default(50)
    }).optional(),
    
    obstacleData: Joi.object({
      type: Joi.string().valid('FeatureCollection').optional(),
      features: Joi.array().items(Joi.object({
        type: Joi.string().valid('Feature').required(),
        geometry: Joi.object({
          type: Joi.string().required(),
          coordinates: Joi.any().required()
        }).required(),
        properties: Joi.object().optional()
      })).min(1).optional()
    }).optional().allow({})
  });

  const { error, value } = shortestPathRequestSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const errorMessages = error.details.map(detail => detail.message);
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: '请求参数验证失败',
        details: errorMessages
      },
      timestamp: new Date().toISOString()
    });
  }

  req.body = value;
  next();
};

module.exports = {
  validateBufferRequest,
  validateIntersectionRequest,
  validateEraseRequest,
  validateShortestPathRequest
};

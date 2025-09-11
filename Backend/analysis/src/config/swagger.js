/**
 * Swagger 配置文件
 */
const swaggerJsdoc = require('swagger-jsdoc');
const config = require('../../config');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: '空间分析服务 API',
      version: '1.0.0',
      description: '基于DDD架构的空间分析服务，提供缓冲区分析、相交分析、擦除分析、最短路径分析功能',
      contact: {
        name: 'SuperMap Team',
        email: 'support@supermap.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: `http://localhost:${config.app.port}`,
        description: '开发环境'
      }
    ],
    components: {
      schemas: {
        BufferAnalysisRequest: {
          type: 'object',
          oneOf: [
            {
              required: ['sourceLayerId', 'bufferSettings']
            },
            {
              required: ['sourceData', 'bufferSettings']
            }
          ],
          properties: {
            sourceLayerId: {
              type: 'string',
              description: '源图层ID（与sourceData二选一）',
              example: 'wuhan_schools'
            },
            sourceData: {
              type: 'object',
              description: '源GeoJSON数据（与sourceLayerId二选一）',
              properties: {
                type: {
                  type: 'string',
                  example: 'FeatureCollection'
                },
                features: {
                  type: 'array',
                  items: {
                    type: 'object'
                  }
                }
              }
            },
            bufferSettings: {
              type: 'object',
              required: ['radius'],
              properties: {
                radius: {
                  type: 'number',
                  description: '缓冲距离（米）',
                  minimum: 0.001,
                  maximum: 100000,
                  example: 100
                },
                semicircleLineSegment: {
                  type: 'integer',
                  description: '圆弧精度（步数）',
                  minimum: 1,
                  maximum: 64,
                  default: 10,
                  example: 10
                }
              }
            },
            featureFilter: {
              type: 'object',
              properties: {
                featureIds: {
                  type: 'array',
                  items: {
                    type: 'string'
                  },
                  description: '要素ID列表（可选，不传则处理所有要素）',
                  example: ['feature_001', 'feature_002']
                },
                spatialFilter: {
                  type: 'object',
                  properties: {
                    bounds: {
                      type: 'array',
                      items: {
                        type: 'number'
                      },
                      minItems: 4,
                      maxItems: 4,
                      description: '空间边界 [minLon, minLat, maxLon, maxLat]（可选）',
                      example: [114.0, 30.0, 115.0, 31.0]
                    }
                  }
                }
              }
            },
            options: {
              type: 'object',
              properties: {
                returnGeometry: {
                  type: 'boolean',
                  description: '是否返回几何数据',
                  default: true,
                  example: true
                },
                returnProperties: {
                  type: 'boolean',
                  description: '是否返回属性数据',
                  default: true,
                  example: true
                },
                resultLayerName: {
                  type: 'string',
                  description: '结果图层名称',
                  example: '缓冲区分析结果'
                }
              }
            }
          }
        },
        BufferAnalysisResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            data: {
              type: 'object',
              properties: {
                resultId: {
                  type: 'string',
                  description: '结果ID',
                  example: 'buffer_result_2024-01-01T00:00:00-000Z'
                },
                resultName: {
                  type: 'string',
                  description: '结果名称',
                  example: '学校缓冲区分析'
                },
                sourceLayerName: {
                  type: 'string',
                  description: '源图层名称',
                  example: '武汉市学校'
                },
                bufferSettings: {
                  type: 'object',
                  properties: {
                    radius: { type: 'number', example: 100 },
                    semicircleLineSegment: { type: 'integer', example: 10 }
                  }
                },
                statistics: {
                  type: 'object',
                  properties: {
                    inputFeatureCount: { type: 'integer', example: 2 },
                    outputFeatureCount: { type: 'integer', example: 2 },
                    totalArea: { type: 'number', example: 6283185.31 },
                    areaUnit: { type: 'string', example: 'square_meters' }
                  }
                },
                features: {
                  type: 'array',
                  description: '结果要素数组',
                  items: {
                    type: 'object'
                  }
                },
                executionTime: {
                  type: 'string',
                  description: '执行时间',
                  example: '0.123s'
                }
              }
            },
            message: {
              type: 'string',
              example: '缓冲区分析执行成功'
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-01T00:00:00.000Z'
            }
          }
        },
        IntersectionAnalysisRequest: {
          type: 'object',
          required: ['targetData', 'maskData'],
          properties: {
            targetData: {
              type: 'object',
              description: '目标图层GeoJSON数据',
              properties: {
                type: {
                  type: 'string',
                  example: 'FeatureCollection'
                },
                features: {
                  type: 'array',
                  items: {
                    type: 'object'
                  }
                }
              }
            },
            maskData: {
              type: 'object',
              description: '遮罩图层GeoJSON数据',
              properties: {
                type: {
                  type: 'string',
                  example: 'FeatureCollection'
                },
                features: {
                  type: 'array',
                  items: {
                    type: 'object'
                  }
                }
              }
            },
            analysisOptions: {
              type: 'object',
              properties: {
                batchSize: {
                  type: 'integer',
                  description: '批处理大小',
                  minimum: 10,
                  maximum: 1000,
                  default: 100,
                  example: 100
                },
                enableProgress: {
                  type: 'boolean',
                  description: '是否启用进度显示',
                  default: true,
                  example: true
                },
                returnGeometry: {
                  type: 'boolean',
                  description: '是否返回几何数据',
                  default: true,
                  example: true
                }
              }
            },
            options: {
              type: 'object',
              properties: {
                resultLayerName: {
                  type: 'string',
                  description: '结果图层名称',
                  example: '相交分析结果'
                },
                enableStatistics: {
                  type: 'boolean',
                  description: '是否启用统计信息',
                  default: true,
                  example: true
                },
                coordinateSystem: {
                  type: 'string',
                  description: '坐标系统',
                  default: 'EPSG:4326',
                  example: 'EPSG:4326'
                }
              }
            }
          }
        },
        IntersectionAnalysisResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            data: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  description: '分析结果ID',
                  example: 'intersection_123'
                },
                name: {
                  type: 'string',
                  description: '分析结果名称',
                  example: '相交分析结果'
                },
                results: {
                  type: 'array',
                  description: '相交结果数组',
                  items: {
                    type: 'object',
                    properties: {
                      id: {
                        type: 'string',
                        example: 'intersection_0_0_1234567890'
                      },
                      name: {
                        type: 'string',
                        example: '相交区域 1'
                      },
                      geometry: {
                        type: 'object'
                      },
                      sourceTargetLayerName: {
                        type: 'string',
                        example: '目标图层'
                      },
                      sourceMaskLayerName: {
                        type: 'string',
                        example: '遮罩图层'
                      },
                      createdAt: {
                        type: 'string',
                        format: 'date-time'
                      }
                    }
                  }
                },
                statistics: {
                  type: 'object',
                  properties: {
                    totalResults: {
                      type: 'integer',
                      example: 1
                    },
                    targetFeatureCount: {
                      type: 'integer',
                      example: 1
                    },
                    maskFeatureCount: {
                      type: 'integer',
                      example: 1
                    },
                    totalPairs: {
                      type: 'integer',
                      example: 1
                    },
                    processingTime: {
                      type: 'integer',
                      example: 150
                    },
                    successRate: {
                      type: 'number',
                      example: 100
                    }
                  }
                },
                metadata: {
                  type: 'object',
                  properties: {
                    version: {
                      type: 'string',
                      example: '1.0.0'
                    },
                    algorithm: {
                      type: 'string',
                      example: 'turf-intersect'
                    },
                    coordinateSystem: {
                      type: 'string',
                      example: 'EPSG:4326'
                    },
                    batchSize: {
                      type: 'integer',
                      example: 100
                    }
                  }
                }
              }
            },
            message: {
              type: 'string',
              example: '相交分析执行成功'
            }
          }
        },
        ShortestPathAnalysisRequest: {
          type: 'object',
          required: ['startPoint', 'endPoint'],
          properties: {
            startPoint: {
              type: 'object',
              description: '起点坐标',
              properties: {
                type: {
                  type: 'string',
                  example: 'Point'
                },
                coordinates: {
                  type: 'array',
                  items: {
                    type: 'number'
                  },
                  minItems: 2,
                  maxItems: 2,
                  example: [114.123, 30.456]
                }
              }
            },
            endPoint: {
              type: 'object',
              description: '终点坐标',
              properties: {
                type: {
                  type: 'string',
                  example: 'Point'
                },
                coordinates: {
                  type: 'array',
                  items: {
                    type: 'number'
                  },
                  minItems: 2,
                  maxItems: 2,
                  example: [114.234, 30.567]
                }
              }
            },
            analysisOptions: {
              type: 'object',
              properties: {
                units: {
                  type: 'string',
                  description: '距离单位',
                  enum: ['kilometers', 'miles', 'meters'],
                  default: 'kilometers',
                  example: 'kilometers'
                },
                resolution: {
                  type: 'integer',
                  description: '路径分辨率',
                  minimum: 100,
                  maximum: 10000,
                  default: 1000,
                  example: 1000
                },
                obstacleLayerId: {
                  type: 'string',
                  description: '障碍物图层ID（可选）',
                  example: 'obstacles_layer'
                }
              }
            },
            obstacleData: {
              type: 'object',
              description: '障碍物数据（可选）',
              properties: {
                type: {
                  type: 'string',
                  example: 'FeatureCollection'
                },
                features: {
                  type: 'array',
                  items: {
                    type: 'object'
                  }
                }
              }
            },
            options: {
              type: 'object',
              properties: {
                returnGeometry: {
                  type: 'boolean',
                  description: '是否返回几何数据',
                  default: true,
                  example: true
                },
                calculateDistance: {
                  type: 'boolean',
                  description: '是否计算距离',
                  default: true,
                  example: true
                },
                calculateDuration: {
                  type: 'boolean',
                  description: '是否计算时间',
                  default: true,
                  example: true
                },
                averageSpeed: {
                  type: 'number',
                  description: '平均速度（km/h）',
                  minimum: 1,
                  maximum: 200,
                  default: 50,
                  example: 50
                }
              }
            }
          }
        },
        ShortestPathAnalysisResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            data: {
              type: 'object',
              properties: {
                resultId: {
                  type: 'string',
                  description: '结果ID',
                  example: 'shortest_path_result_2024-01-01T00:00:00-000Z'
                },
                resultName: {
                  type: 'string',
                  description: '结果名称',
                  example: '最短路径分析结果'
                },
                pathGeometry: {
                  type: 'object',
                  description: '路径几何数据',
                  properties: {
                    type: {
                      type: 'string',
                      example: 'LineString'
                    },
                    coordinates: {
                      type: 'array',
                      items: {
                        type: 'array',
                        items: {
                          type: 'number'
                        }
                      },
                      example: [[114.123, 30.456], [114.234, 30.567]]
                    }
                  }
                },
                statistics: {
                  type: 'object',
                  properties: {
                    distance: {
                      type: 'number',
                      example: 12.34
                    },
                    distanceUnit: {
                      type: 'string',
                      example: 'kilometers'
                    },
                    duration: {
                      type: 'number',
                      example: 14.81
                    },
                    durationUnit: {
                      type: 'string',
                      example: 'minutes'
                    },
                    complexity: {
                      type: 'integer',
                      example: 2
                    },
                    averageSpeed: {
                      type: 'number',
                      example: 50
                    },
                    speedUnit: {
                      type: 'string',
                      example: 'km/h'
                    }
                  }
                },
                executionTime: {
                  type: 'string',
                  description: '执行时间',
                  example: '0.123s'
                }
              }
            },
            message: {
              type: 'string',
              example: '最短路径分析执行成功'
            }
          }
        },
        EraseAnalysisRequest: {
          type: 'object',
          required: ['targetData', 'eraseData'],
          properties: {
            targetData: {
              type: 'object',
              description: '目标图层GeoJSON数据',
              properties: {
                type: {
                  type: 'string',
                  example: 'FeatureCollection'
                },
                features: {
                  type: 'array',
                  items: {
                    type: 'object'
                  }
                }
              }
            },
            eraseData: {
              type: 'object',
              description: '擦除图层GeoJSON数据',
              properties: {
                type: {
                  type: 'string',
                  example: 'FeatureCollection'
                },
                features: {
                  type: 'array',
                  items: {
                    type: 'object'
                  }
                }
              }
            },
            analysisOptions: {
              type: 'object',
              properties: {
                batchSize: {
                  type: 'integer',
                  description: '批处理大小',
                  minimum: 10,
                  maximum: 1000,
                  default: 100,
                  example: 100
                },
                enableProgress: {
                  type: 'boolean',
                  description: '是否启用进度显示',
                  default: true,
                  example: true
                },
                returnGeometry: {
                  type: 'boolean',
                  description: '是否返回几何数据',
                  default: true,
                  example: true
                }
              }
            },
            options: {
              type: 'object',
              properties: {
                resultLayerName: {
                  type: 'string',
                  description: '结果图层名称',
                  example: '擦除分析结果'
                },
                enableStatistics: {
                  type: 'boolean',
                  description: '是否启用统计信息',
                  default: true,
                  example: true
                },
                coordinateSystem: {
                  type: 'string',
                  description: '坐标系统',
                  default: 'EPSG:4326',
                  example: 'EPSG:4326'
                }
              }
            }
          }
        },
        EraseAnalysisResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            data: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  description: '分析结果ID',
                  example: 'erase_123'
                },
                name: {
                  type: 'string',
                  description: '分析结果名称',
                  example: '擦除分析结果'
                },
                results: {
                  type: 'array',
                  description: '擦除结果数组',
                  items: {
                    type: 'object',
                    properties: {
                      id: {
                        type: 'string',
                        example: 'erase_0_0_1234567890'
                      },
                      name: {
                        type: 'string',
                        example: '擦除区域 1'
                      },
                      geometry: {
                        type: 'object'
                      },
                      sourceTargetLayerName: {
                        type: 'string',
                        example: '目标图层'
                      },
                      sourceEraseLayerName: {
                        type: 'string',
                        example: '擦除图层'
                      },
                      createdAt: {
                        type: 'string',
                        format: 'date-time'
                      }
                    }
                  }
                },
                statistics: {
                  type: 'object',
                  properties: {
                    totalResults: {
                      type: 'integer',
                      example: 1
                    },
                    targetFeatureCount: {
                      type: 'integer',
                      example: 1
                    },
                    eraseFeatureCount: {
                      type: 'integer',
                      example: 1
                    },
                    totalPairs: {
                      type: 'integer',
                      example: 1
                    },
                    processingTime: {
                      type: 'integer',
                      example: 150
                    },
                    successRate: {
                      type: 'number',
                      example: 100
                    }
                  }
                },
                metadata: {
                  type: 'object',
                  properties: {
                    version: {
                      type: 'string',
                      example: '1.0.0'
                    },
                    algorithm: {
                      type: 'string',
                      example: 'turf-difference'
                    },
                    coordinateSystem: {
                      type: 'string',
                      example: 'EPSG:4326'
                    },
                    batchSize: {
                      type: 'integer',
                      example: 100
                    }
                  }
                }
              }
            },
            message: {
              type: 'string',
              example: '擦除分析执行成功'
            }
          }
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            error: {
              type: 'object',
              properties: {
                code: {
                  type: 'string',
                  example: 'INVALID_PARAMETER'
                },
                message: {
                  type: 'string',
                  example: '参数验证失败'
                },
                details: {
                  type: 'string',
                  example: 'sourceLayerId 不能为空'
                }
              }
            },
            timestamp: {
              type: 'string',
              format: 'date-time'
            },
            requestId: {
              type: 'string',
              example: 'abc123-def456'
            }
          }
        }
      }
    }
  },
  apis: ['./src/api/routes/*.js', './src/app.js']
};

const specs = swaggerJsdoc(options);

module.exports = specs;

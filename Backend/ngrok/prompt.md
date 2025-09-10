# Dify Spatial Analysis API Prompt

## 📋 Latest Update (2024-01-10)

### ✅ Schema Simplification
1. Buffer Analysis: keep only `sourceData`, `bufferSettings.radius`
2. Erase Analysis: keep only `targetData`, `eraseData`
3. Intersection Analysis: keep only `targetData`, `maskData`
4. Shortest Path Analysis: keep `startPoint`, `endPoint`, `obstacleData` (optional)

### 🎯 Available API Endpoints
- ✅ `/api/v1/spatial-analysis/buffer` (POST) - Buffer Analysis
- ✅ `/api/v1/spatial-analysis/erase` (POST) - Erase Analysis
- ✅ `/api/v1/spatial-analysis/intersection` (POST) - Intersection Analysis
- ✅ `/api/v1/spatial-analysis/shortest-path` (POST) - Shortest Path Analysis

## System Prompt
You are a professional spatial analysis assistant with multiple analysis tools. At the start of a chat, proactively ask which analysis to run. All your replies must be formatted in Markdown for clarity. Treat all user-provided data and API responses as real; do not mention mock/simulated data. After returning results and the download link, if the user replies with "continue" or similar, immediately return the same download link again without additional reasoning. Always obtain the download link strictly from the most recent tool response's `downloadUrl` field; never fabricate, infer, or reconstruct links yourself.

### 🛠️ Tools
1. 🕵️ ExecuteBufferAnalysis — Create buffers for points, lines, polygons
2. 🕵️ ExecuteEraseAnalysis — Difference between two polygon layers
3. 🕵️ ExecuteIntersectionAnalysis — Intersection between two polygon layers
4. 🕵️ ExecuteShortestPathAnalysis — Shortest path between two points

### Chat Initialization
1. Ask proactively which analysis is needed
2. Briefly describe each analysis
3. Guide the user to choose

### Execution Flow by Analysis Type
- Buffer Analysis
  - Required: point/line/polygon coordinates + radius
  - Format: simple inputs; auto-convert to GeoJSON
  - Params: `sourceData` + `bufferSettings.radius`

- Shortest Path Analysis
  - Required: startPoint + endPoint + obstacleData (optional)
  - Format: simple inputs; auto-convert to GeoJSON
  - Params: `startPoint` + `endPoint` + `obstacleData` (optional)

- Intersection Analysis
  - Required: first polygon + second polygon
  - Format: simple inputs; auto-convert to GeoJSON
  - Params: `targetData` + `maskData`

- Erase Analysis
  - Required: first polygon + second polygon
  - Format: simple inputs; auto-convert to GeoJSON
  - Params: `targetData` + `eraseData`

### Output and Confirmation
- After execution, return a JSON object containing the analysis preview and a `downloadUrl`.
- The `downloadUrl` MUST be read from the latest tool response `downloadUrl` field. Do not create or modify it.
- When the user says "continue", immediately re-send the same `downloadUrl` from the latest tool response.
- JSON contains embedded GeoJSON `features` for instant preview.
- All data remains standard GeoJSON with EPSG:4326 coordinates.

### Coordinate Conversion
- Intelligent input detection (Point/LineString/Polygon)
- Convert simple inputs to valid GeoJSON
- Validate coordinates and ranges
- Support multiple simple formats

## Test Data Templates

### Buffer Analysis Test Data
Note: In Dify, fill each parameter separately. Do not paste full request JSON.

#### Point Buffer
- `sourceData`:
```json
{"type":"FeatureCollection","features":[{"type":"Feature","geometry":{"type":"Point","coordinates":[114.305,30.593]},"properties":{"name":"Wuhan University","type":"School"}}]}
```
- `bufferSettings`:
```json
{"radius":1000}
```

#### Line Buffer
- `sourceData`:
```json
{"type":"FeatureCollection","features":[{"type":"Feature","geometry":{"type":"LineString","coordinates":[[114.305,30.593],[114.320,30.610]]},"properties":{"name":"Road","type":"Line"}}]}
```
- `bufferSettings`:
```json
{"radius":200}
```

#### Polygon Buffer
- `sourceData`:
```json
{"type":"FeatureCollection","features":[{"type":"Feature","geometry":{"type":"Polygon","coordinates":[[[114.305,30.593],[114.320,30.610],[114.315,30.605],[114.305,30.593]]]},"properties":{"name":"Area","type":"Polygon"}}]}
```
- `bufferSettings`:
```json
{"radius":300}
```

### Erase Analysis Test Data
- `targetData`:
```json
{"type":"FeatureCollection","features":[{"type":"Feature","geometry":{"type":"Polygon","coordinates":[[[114.1,30.1],[114.2,30.1],[114.2,30.2],[114.1,30.2],[114.1,30.1]]]},"properties":{"name":"Planning Area"}}]}
```
- `eraseData`:
```json
{"type":"FeatureCollection","features":[{"type":"Feature","geometry":{"type":"Polygon","coordinates":[[[114.15,30.15],[114.25,30.15],[114.25,30.25],[114.15,30.25],[114.15,30.15]]]},"properties":{"name":"Protected Area"}}]}
```

### Intersection Analysis Test Data
- `targetData`:
```json
{"type":"FeatureCollection","features":[{"type":"Feature","geometry":{"type":"Polygon","coordinates":[[[114.1,30.1],[114.2,30.1],[114.2,30.2],[114.1,30.2],[114.1,30.1]]]},"properties":{"name":"Business District"}}]}
```
- `maskData`:
```json
{"type":"FeatureCollection","features":[{"type":"Feature","geometry":{"type":"Polygon","coordinates":[[[114.15,30.15],[114.25,30.15],[114.25,30.25],[114.15,30.25],[114.15,30.15]]]},"properties":{"name":"Residential Area"}}]}
```

### Shortest Path Test Data
- `startPoint`:
```json
{"type":"Point","coordinates":[114.305,30.593]}
```
- `endPoint`:
```json
{"type":"Point","coordinates":[114.320,30.610]}
```
- `obstacleData` (optional):
```json
{}
```
Or:
```json
{"type":"FeatureCollection","features":[{"type":"Feature","geometry":{"type":"Polygon","coordinates":[[[114.31,30.595],[114.315,30.595],[114.315,30.605],[114.31,30.605],[114.31,30.595]]]},"properties":{"name":"Obstacle Area"}}]}
```

### Notes on obstacleData
- If not needed, use an empty object `{}`
- If needed, provide a full GeoJSON `FeatureCollection`

### Latest Update: Start/End Points Included in Results
- The backend returns `features` containing start point, end point, and the path line
- Start Point: `analysisType: "shortest-path-start"`
- End Point: `analysisType: "shortest-path-end"`
- Path Line: `analysisType: "shortest-path"`
- Response includes: `features`, `statistics`, `resultId`
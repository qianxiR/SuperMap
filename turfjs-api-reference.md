# Turf.js API 参考文档

## 裁剪 (Clip)

### bboxClip
```javascript
const clipped = turf.bboxClip(geojson, bbox);
```
- **参数**: geojson(GeoJSON对象), bbox([minX, minY, maxX, maxY])
- **返回**: 裁剪后的GeoJSON对象

### mask
```javascript
const masked = turf.mask(geojson, polygon);
```
- **参数**: geojson(要裁剪的对象), polygon(裁剪多边形)
- **返回**: 裁剪后的GeoJSON对象

## 相交 (Intersect)

### intersect
```javascript
const intersection = turf.intersect(polygon1, polygon2);
```
- **参数**: polygon1(第一个多边形), polygon2(第二个多边形)
- **返回**: 相交部分的GeoJSON多边形

### lineIntersect
```javascript
const intersections = turf.lineIntersect(line1, line2);
```
- **参数**: line1(第一条线), line2(第二条线)
- **返回**: 交点集合的GeoJSON点集合

## 结合 (Union)

### union
```javascript
const merged = turf.union(polygon1, polygon2);
```
- **参数**: polygon1(第一个多边形), polygon2(第二个多边形)
- **返回**: 合并后的GeoJSON多边形

## 多边形转线 (Polygon to Line)

### polygonToLine
```javascript
const lines = turf.polygonToLine(polygon);
```
- **参数**: polygon(要转换的多边形)
- **返回**: LineString或MultiLineString的GeoJSON对象

## 线相交 (Line Intersect)

### lineIntersect
```javascript
const intersections = turf.lineIntersect(line1, line2);
```
- **参数**: line1(第一条线), line2(第二条线)
- **返回**: 交点集合的FeatureCollection<Point>

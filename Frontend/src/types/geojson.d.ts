declare module "*.geojson" {
  const value: {
    type: "FeatureCollection"
    features: Array<{
      type: "Feature"
      geometry: {
        type: "Point" | "LineString" | "Polygon" | "MultiPoint" | "MultiLineString" | "MultiPolygon"
        coordinates: any
      }
      properties: Record<string, any>
    }>
  }
  export default value
}

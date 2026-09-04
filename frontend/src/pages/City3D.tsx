import CesiumCityViewer from '../components/CesiumCityViewer';

/** City-scale 3D context (Cesium OSM + terrain) with our cadastral layer extruded on top. */
export default function City3D() {
  return (
    <div className="p-4 space-y-3">
      <div className="text-sm"><span className="font-bold text-lg text-navy">City 3D — Saket, Delhi</span>
        <span className="text-xs text-slate-500 ml-2">OSM buildings + terrain for context · colored extrusions are demo cadastre (click → tower)</span></div>
      <CesiumCityViewer />
    </div>
  );
}

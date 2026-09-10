import { useState } from 'react'

function GardenMapView({ plots, occupiedPlots, onSelectPlot, onClose }) {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('Tất cả trạng thái')
  const visiblePlots = plots.filter((plot) => {
    const matchesQuery = `${plot.code} ${plot.location} ${plot.soil}`.toLowerCase().includes(query.toLowerCase())
    const isOccupied = occupiedPlots.some((occupiedPlot) => occupiedPlot.id === plot.id)
    const matchesStatus = status === 'Tất cả trạng thái' || (status === 'Đang trống' && !isOccupied) || (status === 'Đã thuê' && isOccupied)
    return matchesQuery && matchesStatus
  })

  return <div className="garden-map-overlay" role="dialog" aria-modal="true" aria-label="Bản đồ khu vườn" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <div className="garden-map-toolbar">
      <div className="map-search"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm ô đất hoặc khu vực" /></div>
      <select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Lọc trạng thái"><option>Tất cả trạng thái</option><option>Đang trống</option><option>Đã thuê</option></select>
      <select aria-label="Lọc loại đất"><option>Loại cây trồng</option><option>Rau xanh</option><option>Cây ăn quả</option></select>
      <button className="map-filter-button" type="button">☷ &nbsp; Tất cả bộ lọc</button>
      <button className="map-close" type="button" onClick={onClose} aria-label="Đóng bản đồ">×</button>
    </div>
    <div className="garden-map-content">
      <aside className="map-listings">
        <div className="map-listings-heading"><div><h2>Tìm ô đất để thuê</h2><p>Hiển thị {visiblePlots.length}/{plots.length} ô đất</p></div><select aria-label="Sắp xếp"><option>Mới nhất</option><option>Giá thấp nhất</option></select></div>
        <div className="map-list-grid">{visiblePlots.map((plot, index) => { const isOccupied = occupiedPlots.some((occupiedPlot) => occupiedPlot.id === plot.id); return <article className="map-listing" key={plot.id} onClick={() => !isOccupied && onSelectPlot(plot)}><div className={`map-listing-image map-listing-image-${(index % 4) + 1}`}><span className={isOccupied ? 'map-listing-status occupied' : 'map-listing-status'}><i /> {isOccupied ? 'Đã thuê' : 'Đang trống'}</span><span className="map-listing-heart">♡</span></div><div className="map-listing-body"><strong>{plot.price.toLocaleString('vi-VN')}đ<small>/ tháng</small></strong><p>{plot.location}</p><span>{plot.code} · {plot.area}m² &nbsp; <b>●</b> Có chăm sóc</span></div></article> })}</div>
      </aside>
      <section className="garden-map-canvas" aria-label="Bản đồ vệ tinh khu vườn"><div className="map-location-label">VƯỜN PHÚC LỘC<br /><small>ĐÀ NẴNG</small></div>{plots.map((plot, index) => { const isOccupied = occupiedPlots.some((occupiedPlot) => occupiedPlot.id === plot.id); return <button key={plot.id} type="button" className={`map-marker ${isOccupied ? 'occupied' : ''} marker-${index + 1}`} onClick={() => !isOccupied && onSelectPlot(plot)} aria-label={`Chọn ô ${plot.code}`}>{plot.code}</button> })}<div className="map-zoom"><button type="button">+</button><button type="button">−</button></div><div className="map-compass">N</div></section>
    </div>
  </div>
}

export default GardenMapView

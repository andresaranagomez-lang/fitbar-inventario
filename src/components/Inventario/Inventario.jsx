import { useMemo, useState } from 'react'

function Inventario({ productos = [], movimientos = [] }) {
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('Todos')

  const materiasPrimas = useMemo(
    () => productos.filter((producto) => producto.tipo === 'Materia prima'),
    [productos]
  )

  const inventario = useMemo(() => {
    return materiasPrimas.map((producto) => {
      const stock = Number(producto.stock) || 0
      const stockMinimo = Number(producto.stockMinimo) || 0
      const costo = Number(producto.costo) || 0

      let estado = 'Normal'

      if (stock <= 0) {
        estado = 'Sin existencias'
      } else if (stockMinimo > 0 && stock <= stockMinimo) {
        estado = 'Stock bajo'
      }

      return {
        ...producto,
        stockCalculado: stock,
        stockMinimo,
        costoUnitario: costo,
        valorInventario: stock * costo,
        estado,
      }
    })
  }, [materiasPrimas])

  const inventarioFiltrado = useMemo(() => {
    const termino = busqueda.trim().toLowerCase()

    return inventario.filter((producto) => {
      const coincideBusqueda =
        !termino ||
        producto.nombre?.toLowerCase().includes(termino) ||
        producto.codigo?.toLowerCase().includes(termino)

      const coincideEstado =
        filtroEstado === 'Todos' || producto.estado === filtroEstado

      return coincideBusqueda && coincideEstado
    })
  }, [inventario, busqueda, filtroEstado])

  const totalInventario = inventario.reduce(
    (total, producto) => total + producto.valorInventario,
    0
  )

  const stockBajo = inventario.filter(
    (producto) => producto.estado === 'Stock bajo'
  ).length

  const sinExistencias = inventario.filter(
    (producto) => producto.estado === 'Sin existencias'
  ).length

  const totalEntradas = movimientos.filter(
    (movimiento) => movimiento.tipo === 'Entrada'
  ).length

  const totalSalidas = movimientos.filter(
    (movimiento) => movimiento.tipo === 'Salida'
  ).length

  const formatoNumero = (valor) =>
    Number(valor || 0).toLocaleString('es-CO', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })

  const formatoMoneda = (valor) =>
    Number(valor || 0).toLocaleString('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    })

  const limpiarFiltros = () => {
    setBusqueda('')
    setFiltroEstado('Todos')
  }

  return (
    <>
      <div className="page-header inventory-page-header">
        <div>
          <span className="eyebrow">CONTROL · FITBAR</span>
          <h1>Inventario</h1>
          <p>
            Control central de existencias, costos y disponibilidad de materias
            primas.
          </p>
        </div>

        <div className="inventory-header-status">
          <span className="inventory-live-dot" />
          <div>
            <strong>Inventario activo</strong>
            <small>Actualizado con movimientos registrados</small>
          </div>
        </div>
      </div>

      <div className="summary-grid inventory-summary-grid">
        <div className="summary-card inventory-kpi">
          <div className="inventory-kpi-icon">▦</div>
          <div>
            <span>Materias primas</span>
            <strong>{materiasPrimas.length}</strong>
            <small>Ingredientes controlados</small>
          </div>
        </div>

        <div className="summary-card inventory-kpi inventory-kpi-value">
          <div className="inventory-kpi-icon">◈</div>
          <div>
            <span>Valor inventario</span>
            <strong>{formatoMoneda(totalInventario)}</strong>
            <small>Valor actual de existencias</small>
          </div>
        </div>

        <div className="summary-card inventory-kpi inventory-kpi-warning">
          <div className="inventory-kpi-icon">!</div>
          <div>
            <span>Stock bajo</span>
            <strong>{stockBajo}</strong>
            <small>Requieren atención</small>
          </div>
        </div>

        <div className="summary-card inventory-kpi inventory-kpi-danger">
          <div className="inventory-kpi-icon">×</div>
          <div>
            <span>Sin existencias</span>
            <strong>{sinExistencias}</strong>
            <small>No disponibles</small>
          </div>
        </div>
      </div>

      <section className="panel inventory-control-panel">
        <div className="panel-header inventory-control-header">
          <div>
            <span className="section-kicker">CONSULTA</span>
            <h2>Control de inventario</h2>
            <p>
              Filtra las materias primas y revisa rápidamente su situación
              actual.
            </p>
          </div>

          {(busqueda || filtroEstado !== 'Todos') && (
            <button
              type="button"
              className="secondary-button"
              onClick={limpiarFiltros}
            >
              Limpiar filtros
            </button>
          )}
        </div>

        <div className="inventory-filters">
          <div className="inventory-search">
            <span className="inventory-search-icon">⌕</span>
            <input
              type="text"
              value={busqueda}
              onChange={(event) => setBusqueda(event.target.value)}
              placeholder="Buscar por materia prima o código..."
            />
          </div>

          <div className="inventory-status-filter">
            <select
              value={filtroEstado}
              onChange={(event) => setFiltroEstado(event.target.value)}
            >
              <option value="Todos">Todos los estados</option>
              <option value="Normal">Normal</option>
              <option value="Stock bajo">Stock bajo</option>
              <option value="Sin existencias">Sin existencias</option>
            </select>
          </div>
        </div>
      </section>

      <section className="panel inventory-table-panel">
        <div className="panel-header inventory-table-header">
          <div>
            <span className="section-kicker">EXISTENCIAS</span>
            <h2>Materias primas disponibles</h2>
            <p>
              Los saldos se actualizan automáticamente con las Entradas y
              Salidas.
            </p>
          </div>

          <div className="inventory-table-meta">
            <span className="count-badge">
              {inventarioFiltrado.length} de {inventario.length}
            </span>
          </div>
        </div>

        <div className="table-wrapper inventory-table-wrapper">
          <table className="data-table inventory-table">
            <thead>
              <tr>
                <th>CÓDIGO</th>
                <th>MATERIA PRIMA</th>
                <th>UNIDAD</th>
                <th>STOCK ACTUAL</th>
                <th>STOCK MÍNIMO</th>
                <th>COSTO UNITARIO</th>
                <th>VALOR INVENTARIO</th>
                <th>ESTADO</th>
              </tr>
            </thead>

            <tbody>
              {inventarioFiltrado.length === 0 ? (
                <tr>
                  <td colSpan="8">
                    <div className="table-empty inventory-empty">
                      <div className="inventory-empty-icon">⌕</div>
                      <strong>No hay materias primas para mostrar</strong>
                      <span>
                        Ajusta los filtros o registra materias primas en
                        Productos.
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                inventarioFiltrado.map((producto) => (
                  <tr key={producto.id}>
                    <td>
                      <span className="inventory-code">{producto.codigo}</span>
                    </td>

                    <td>
                      <div className="inventory-product-name">
                        <span className="inventory-product-icon">MP</span>
                        <strong>{producto.nombre}</strong>
                      </div>
                    </td>

                    <td>
                      <span className="inventory-unit">
                        {producto.unidad || '—'}
                      </span>
                    </td>

                    <td>
                      <div className="inventory-stock">
                        <strong>{formatoNumero(producto.stockCalculado)}</strong>
                        <small>{producto.unidad || ''}</small>
                      </div>
                    </td>

                    <td>
                      <span className="inventory-minimum">
                        {producto.stockMinimo > 0
                          ? `${formatoNumero(producto.stockMinimo)} ${
                              producto.unidad || ''
                            }`
                          : '—'}
                      </span>
                    </td>

                    <td>
                      {producto.costoUnitario > 0 ? (
                        <span className="inventory-money">
                          {formatoMoneda(producto.costoUnitario)}
                        </span>
                      ) : (
                        <span className="inventory-cost-pending">
                          Costo pendiente
                        </span>
                      )}
                    </td>

                    <td>
                      {producto.costoUnitario > 0 ? (
                        <strong className="inventory-total-value">
                          {formatoMoneda(producto.valorInventario)}
                        </strong>
                      ) : (
                        <span className="inventory-value-pending">
                          Pendiente
                        </span>
                      )}
                    </td>

                    <td>
                      <span
                        className={`status-badge status-${producto.estado
                          .toLowerCase()
                          .replaceAll(' ', '-')}`}
                      >
                        {producto.estado}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel inventory-flow-panel">
        <div className="panel-header inventory-flow-header">
          <div>
            <span className="section-kicker">TRAZABILIDAD</span>
            <h2>Flujo del inventario</h2>
            <p>
              El saldo se construye automáticamente a partir de los
              movimientos registrados.
            </p>
          </div>
        </div>

        <div className="inventory-flow">
          <div className="flow-card inventory-flow-card">
            <span className="flow-icon">↑</span>
            <div>
              <strong>Entradas</strong>
              <small>{totalEntradas} movimientos registrados</small>
            </div>
          </div>

          <div className="flow-arrow">→</div>

          <div className="flow-card featured inventory-flow-card">
            <span className="flow-icon">▦</span>
            <div>
              <strong>Inventario</strong>
              <small>Existencia actual de materias primas</small>
            </div>
          </div>

          <div className="flow-arrow">←</div>

          <div className="flow-card inventory-flow-card">
            <span className="flow-icon">↓</span>
            <div>
              <strong>Salidas</strong>
              <small>{totalSalidas} movimientos registrados</small>
            </div>
          </div>
        </div>

        <div className="inventory-control-note">
          <span>i</span>
          <div>
            <strong>Control simple y práctico</strong>
            <small>
              El stock del sistema se mantiene mediante Entradas y Salidas.
              Para un inventario físico, compara la existencia real contra el
              saldo mostrado aquí antes de realizar cualquier ajuste.
            </small>
          </div>
        </div>
      </section>
    </>
  )
}

export default Inventario

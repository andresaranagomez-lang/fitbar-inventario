import { useMemo, useState } from 'react'

function Reportes({
  productos = [],
  movimientos = [],
  recetas = [],
}) {
  const [periodo, setPeriodo] = useState('todos')
  const [productoFiltro, setProductoFiltro] = useState('Todos')

  const formatearMoneda = (valor) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(Number(valor) || 0)

  const formatearNumero = (valor) =>
    Number(valor || 0).toLocaleString('es-CO', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })

  const fechaActual = new Date()

  const movimientosBase = useMemo(
    () =>
      movimientos.filter(
        (movimiento) =>
          movimiento.tipo === 'Entrada' || movimiento.tipo === 'Salida'
      ),
    [movimientos]
  )

  const movimientosFiltrados = useMemo(() => {
    return movimientosBase.filter((movimiento) => {
      const fecha = movimiento.fecha ? new Date(`${movimiento.fecha}T00:00:00`) : null
      if (!fecha || Number.isNaN(fecha.getTime())) return false

      const cumplePeriodo =
        periodo === 'todos' ||
        (periodo === 'mes' &&
          fecha.getMonth() === fechaActual.getMonth() &&
          fecha.getFullYear() === fechaActual.getFullYear()) ||
        (periodo === 'mesAnterior' && (() => {
          const anterior = new Date(fechaActual.getFullYear(), fechaActual.getMonth() - 1, 1)
          return (
            fecha.getMonth() === anterior.getMonth() &&
            fecha.getFullYear() === anterior.getFullYear()
          )
        })()) ||
        (periodo === 'anio' && fecha.getFullYear() === fechaActual.getFullYear())

      const cumpleProducto =
        productoFiltro === 'Todos' ||
        Number(movimiento.productoId) === Number(productoFiltro)

      return cumplePeriodo && cumpleProducto
    })
  }, [movimientosBase, periodo, productoFiltro, fechaActual])

  const datos = useMemo(() => {
    const ventas = movimientosFiltrados.filter((m) => m.tipo === 'Salida')
    const compras = movimientosBase.filter((m) => {
      if (m.tipo !== 'Entrada') return false

      const fecha = m.fecha
        ? new Date(`${m.fecha}T00:00:00`)
        : null

      if (!fecha || Number.isNaN(fecha.getTime())) return false

      if (periodo === 'todos') return true

      if (periodo === 'mes') {
        return (
          fecha.getMonth() === fechaActual.getMonth() &&
          fecha.getFullYear() === fechaActual.getFullYear()
        )
      }

      if (periodo === 'mesAnterior') {
        const anterior = new Date(
          fechaActual.getFullYear(),
          fechaActual.getMonth() - 1,
          1
        )

        return (
          fecha.getMonth() === anterior.getMonth() &&
          fecha.getFullYear() === anterior.getFullYear()
        )
      }

      if (periodo === 'anio') {
        return fecha.getFullYear() === fechaActual.getFullYear()
      }

      return true
    })

    const ingresos = ventas.reduce(
      (total, movimiento) =>
        total + (Number(movimiento.valorTotal ?? movimiento.valorFinanciero) || 0),
      0
    )

    const egresos = compras.reduce(
      (total, movimiento) =>
        total + (Number(movimiento.costoTotal ?? movimiento.valorFinanciero ?? movimiento.valorTotal) || 0),
      0
    )

    const costoPorProducto = new Map(
      productos.map((producto) => [Number(producto.id), Number(producto.costo) || 0])
    )

    const recetaPorProducto = new Map(
      recetas.map((receta) => [Number(receta.productoId), receta])
    )

    const costoUnitarioProducto = (productoId) => {
      const receta = recetaPorProducto.get(Number(productoId))
      if (!receta) return 0

      return receta.ingredientes.reduce((total, ingrediente) => {
        const costoMateriaPrima =
          costoPorProducto.get(Number(ingrediente.productoId)) || 0
        const cantidad = Number(ingrediente.cantidad) || 0
        return total + cantidad * costoMateriaPrima
      }, 0)
    }

    const costoVentasEstimado = ventas.reduce((total, venta) => {
      if (venta.costoTotalHistorico !== undefined) {
        return total + (Number(venta.costoTotalHistorico) || 0)
      }

      const costoUnitario = costoUnitarioProducto(venta.productoId)
      return total + costoUnitario * (Number(venta.cantidad) || 0)
    }, 0)

    const utilidadBrutaEstimada = ingresos - costoVentasEstimado
    const margenBruto =
      ingresos > 0 ? (utilidadBrutaEstimada / ingresos) * 100 : 0

    const ticketPromedio = ventas.length > 0 ? ingresos / ventas.length : 0

    const efectivo = ventas
      .filter((m) => (m.formaPago || 'Efectivo') === 'Efectivo')
      .reduce((total, m) => total + (Number(m.valorTotal) || 0), 0)

    const transferencias = ventas
      .filter((m) => m.formaPago === 'Transferencia')
      .reduce((total, m) => total + (Number(m.valorTotal) || 0), 0)

    const ventasPorProducto = productos
      .filter((producto) => producto.tipo === 'Producto Fitbar')
      .map((producto) => {
        const ventasProducto = ventas.filter(
          (venta) => Number(venta.productoId) === Number(producto.id)
        )
        const cantidad = ventasProducto.reduce(
          (total, venta) => total + (Number(venta.cantidad) || 0),
          0
        )
        const valorVenta = ventasProducto.reduce(
          (total, venta) => total + (Number(venta.valorTotal) || 0),
          0
        )
        const costoEstimado = ventasProducto.reduce((total, venta) => {
          if (venta.costoTotalHistorico !== undefined) {
            return total + (Number(venta.costoTotalHistorico) || 0)
          }

          return (
            total +
            costoUnitarioProducto(producto.id) *
              (Number(venta.cantidad) || 0)
          )
        }, 0)

        const costoUnitario =
          cantidad > 0 ? costoEstimado / cantidad : 0
        const utilidad = valorVenta - costoEstimado
        const margen = valorVenta > 0 ? (utilidad / valorVenta) * 100 : 0

        return {
          ...producto,
          cantidad,
          valorVenta,
          costoEstimado,
          utilidad,
          margen,
          costoUnitario,
        }
      })
      .filter((producto) => producto.cantidad > 0)
      .sort((a, b) => b.valorVenta - a.valorVenta)

    const consumoMaterias = new Map()

    ventas.forEach((venta) => {
      const receta = recetaPorProducto.get(Number(venta.productoId))
      if (!receta) return

      receta.ingredientes.forEach((ingrediente) => {
        const producto = productos.find(
          (item) => Number(item.id) === Number(ingrediente.productoId)
        )
        if (!producto) return

        const cantidad =
          (Number(ingrediente.cantidad) || 0) *
          (Number(venta.cantidad) || 0)

        const anterior = consumoMaterias.get(Number(producto.id)) || {
          id: producto.id,
          nombre: producto.nombre,
          codigo: producto.codigo,
          unidad: producto.unidad,
          cantidad: 0,
          costoEstimado: 0,
        }

        anterior.cantidad += cantidad

        // Si la venta tiene snapshot de costos, usamos el costo histórico
        // guardado en el movimiento; para ventas antiguas se mantiene el
        // costo actual como respaldo.
        const ingredienteVendido = (venta.consumos || []).find(
          (item) => Number(item.productoId) === Number(producto.id)
        )

        const costoHistorico =
          ingredienteVendido?.costoUnitarioHistorico !== undefined
            ? Number(ingredienteVendido.costoUnitarioHistorico) || 0
            : Number(producto.costo) || 0

        anterior.costoEstimado += cantidad * costoHistorico
        consumoMaterias.set(Number(producto.id), anterior)
      })
    })

    const materiasConsumidas = Array.from(consumoMaterias.values()).sort(
      (a, b) => b.costoEstimado - a.costoEstimado
    )

    const inventarioValor = productos
      .filter((producto) => producto.tipo === 'Materia prima')
      .reduce(
        (total, producto) =>
          total +
          (Number(producto.stock) || 0) * (Number(producto.costo) || 0),
        0
      )

    const mensual = new Map()

    movimientosFiltrados.forEach((movimiento) => {
      const fecha = movimiento.fecha || ''
      const clave = fecha.slice(0, 7)
      if (!clave) return

      const item = mensual.get(clave) || {
        mes: clave,
        ingresos: 0,
        costoVentas: 0,
        compras: 0,
        utilidad: 0,
      }

      if (movimiento.tipo === 'Salida') {
        item.ingresos += Number(movimiento.valorTotal) || 0
        item.costoVentas += Number(movimiento.costoTotalHistorico) || 0
      }

      mensual.set(clave, item)
    })

    compras.forEach((movimiento) => {
      const fecha = movimiento.fecha || ''
      const clave = fecha.slice(0, 7)
      if (!clave) return

      const item = mensual.get(clave) || {
        mes: clave,
        ingresos: 0,
        costoVentas: 0,
        compras: 0,
        utilidad: 0,
      }

      item.compras +=
        Number(
          movimiento.costoTotal ??
            movimiento.valorFinanciero ??
            movimiento.valorTotal
        ) || 0

      mensual.set(clave, item)
    })

    const evolucionMensual = Array.from(mensual.values())
      .sort((a, b) => a.mes.localeCompare(b.mes))
      .map((item) => ({
        ...item,
        utilidad: item.ingresos - item.costoVentas,
      }))

    return {
      ventas,
      compras,
      ingresos,
      egresos,
      costoVentasEstimado,
      utilidadBrutaEstimada,
      margenBruto,
      ticketPromedio,
      efectivo,
      transferencias,
      ventasPorProducto,
      materiasConsumidas,
      inventarioValor,
      evolucionMensual,
    }
  }, [movimientosFiltrados, productos, recetas])

  const maxVentasProducto = Math.max(
    ...datos.ventasPorProducto.map((item) => item.valorVenta),
    1
  )

  const maxMensual = Math.max(
    ...datos.evolucionMensual.flatMap((item) => [
      item.ingresos,
      item.costoVentas,
      item.compras,
    ]),
    1
  )

  const nombreMes = (clave) => {
    const [anio, mes] = clave.split('-')
    const fecha = new Date(Number(anio), Number(mes) - 1, 1)
    return fecha.toLocaleDateString('es-CO', {
      month: 'short',
      year: 'numeric',
    })
  }

  return (
    <>
      <div className="page-header">
        <div>
          <span className="eyebrow">ANÁLISIS · FITBAR</span>
          <h1>Reportes</h1>
          <p>
            Indicadores de ventas, costos, rentabilidad e inventario para la
            toma de decisiones.
          </p>
        </div>
      </div>

      <section className="panel" style={{ marginBottom: '18px' }}>
        <div className="panel-header">
          <div>
            <h2>Filtros de análisis</h2>
            <p>Selecciona el período y, si deseas, un producto específico.</p>
          </div>
        </div>

        <div className="form-grid" style={{ padding: '20px' }}>
          <label>
            Período
            <select
              value={periodo}
              onChange={(event) => setPeriodo(event.target.value)}
            >
              <option value="todos">Todo el historial</option>
              <option value="mes">Mes actual</option>
              <option value="mesAnterior">Mes anterior</option>
              <option value="anio">Año actual</option>
            </select>
          </label>

          <label>
            Producto Fitbar
            <select
              value={productoFiltro}
              onChange={(event) => setProductoFiltro(event.target.value)}
            >
              <option value="Todos">Todos los productos</option>
              {productos
                .filter((producto) => producto.tipo === 'Producto Fitbar')
                .map((producto) => (
                  <option key={producto.id} value={producto.id}>
                    {producto.nombre}
                  </option>
                ))}
            </select>
          </label>
        </div>
      </section>

      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-label">Ventas</span>
          <strong>{formatearMoneda(datos.ingresos)}</strong>
          <small>{datos.ventas.length} ventas registradas</small>
        </div>

        <div className="stat-card">
          <span className="stat-label">Costo de ventas estimado</span>
          <strong>{formatearMoneda(datos.costoVentasEstimado)}</strong>
          <small>Según recetas y costos actuales</small>
        </div>

        <div className="stat-card">
          <span className="stat-label">Utilidad bruta estimada</span>
          <strong>{formatearMoneda(datos.utilidadBrutaEstimada)}</strong>
          <small>Ventas menos costo estimado</small>
        </div>

        <div className="stat-card">
          <span className="stat-label">Margen bruto</span>
          <strong>{formatearNumero(datos.margenBruto)}%</strong>
          <small>Rentabilidad estimada sobre ventas</small>
        </div>
      </div>

      <div className="stats-grid" style={{ marginTop: '18px' }}>
        <div className="stat-card">
          <span className="stat-label">Compras</span>
          <strong>{formatearMoneda(datos.egresos)}</strong>
          <small>Entradas de materias primas</small>
        </div>

        <div className="stat-card">
          <span className="stat-label">Ticket promedio</span>
          <strong>{formatearMoneda(datos.ticketPromedio)}</strong>
          <small>Venta promedio</small>
        </div>

        <div className="stat-card">
          <span className="stat-label">Ventas en efectivo</span>
          <strong>{formatearMoneda(datos.efectivo)}</strong>
          <small>Recaudo físico</small>
        </div>

        <div className="stat-card">
          <span className="stat-label">Ventas por transferencia</span>
          <strong>{formatearMoneda(datos.transferencias)}</strong>
          <small>Recaudo bancario</small>
        </div>
      </div>

      <div className="dashboard-two-columns" style={{ marginTop: '18px' }}>
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Ventas por producto</h2>
              <p>Productos que más ingresos están generando.</p>
            </div>
          </div>

          {datos.ventasPorProducto.length === 0 ? (
            <div className="empty-state">
              <strong>No hay ventas para el filtro seleccionado</strong>
              <span>Registra ventas en Salidas para alimentar este reporte.</span>
            </div>
          ) : (
            <div style={{ padding: '20px' }}>
              {datos.ventasPorProducto.slice(0, 8).map((producto) => (
                <div
                  key={producto.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr auto',
                    gap: '12px',
                    marginBottom: '18px',
                  }}
                >
                  <div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: '12px',
                        marginBottom: '7px',
                      }}
                    >
                      <strong>{producto.nombre}</strong>
                      <span>{formatearMoneda(producto.valorVenta)}</span>
                    </div>
                    <div
                      style={{
                        height: '9px',
                        background: '#edf1ee',
                        borderRadius: '99px',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          width: `${(producto.valorVenta / maxVentasProducto) * 100}%`,
                          height: '100%',
                          background: 'var(--primary, #17211d)',
                          borderRadius: '99px',
                        }}
                      />
                    </div>
                    <small>
                      {formatearNumero(producto.cantidad)} und · Margen{' '}
                      {formatearNumero(producto.margen)}%
                    </small>
                  </div>
                  <strong>{formatearMoneda(producto.utilidad)}</strong>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Evolución mensual</h2>
              <p>Comparación mensual de ventas y compras registradas.</p>
            </div>
          </div>

          {datos.evolucionMensual.length === 0 ? (
            <div className="empty-state">
              <strong>Aún no hay movimientos suficientes</strong>
              <span>Los meses aparecerán automáticamente con tus registros.</span>
            </div>
          ) : (
            <div style={{ padding: '20px' }}>
              {datos.evolucionMensual.map((mes) => (
                <div key={mes.mes} style={{ marginBottom: '20px' }}>
                  <strong style={{ display: 'block', marginBottom: '8px' }}>
                    {nombreMes(mes.mes)}
                  </strong>

                  <div style={{ display: 'grid', gap: '7px' }}>
                    <div>
                      <small>Ventas {formatearMoneda(mes.ingresos)}</small>
                      <div
                        style={{
                          height: '10px',
                          background: '#edf1ee',
                          borderRadius: '99px',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            width: `${(mes.ingresos / maxMensual) * 100}%`,
                            height: '100%',
                            background: 'var(--primary, #17211d)',
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <small>
                        Costo de ventas {formatearMoneda(mes.costoVentas)}
                      </small>
                      <div
                        style={{
                          height: '10px',
                          background: '#edf1ee',
                          borderRadius: '99px',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            width: `${(mes.costoVentas / maxMensual) * 100}%`,
                            height: '100%',
                            background: '#d9e0dc',
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <small>Compras {formatearMoneda(mes.compras)}</small>
                      <div
                        style={{
                          height: '10px',
                          background: '#edf1ee',
                          borderRadius: '99px',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            width: `${(mes.compras / maxMensual) * 100}%`,
                            height: '100%',
                            background: '#e7ebe9',
                          }}
                        />
                      </div>
                    </div>

                    <small>
                      Utilidad bruta del mes:{' '}
                      <strong>{formatearMoneda(mes.utilidad)}</strong>
                    </small>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="dashboard-two-columns" style={{ marginTop: '18px' }}>
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Consumo de materias primas</h2>
              <p>
                Estimación de consumo generado por las ventas según las recetas.
              </p>
            </div>
          </div>

          {datos.materiasConsumidas.length === 0 ? (
            <div className="empty-state">
              <strong>No hay consumo calculado</strong>
              <span>Se alimenta automáticamente desde las ventas y recetas.</span>
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Materia prima</th>
                    <th>Consumo</th>
                    <th>Costo estimado</th>
                  </tr>
                </thead>
                <tbody>
                  {datos.materiasConsumidas.slice(0, 10).map((materia) => (
                    <tr key={materia.id}>
                      <td>
                        <strong>{materia.nombre}</strong>
                        <small>{materia.codigo}</small>
                      </td>
                      <td>
                        {formatearNumero(materia.cantidad)} {materia.unidad}
                      </td>
                      <td>
                        <strong>{formatearMoneda(materia.costoEstimado)}</strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Situación del inventario</h2>
              <p>Valor estimado de las materias primas disponibles.</p>
            </div>
          </div>

          <div style={{ padding: '20px' }}>
            <div className="recipe-summary">
              <div>
                <span>Valor del inventario</span>
                <strong>{formatearMoneda(datos.inventarioValor)}</strong>
              </div>
              <div className="recipe-summary-info">
                <span>Se calcula con stock actual × costo promedio actual.</span>
              </div>
            </div>

            <div className="product-list" style={{ marginTop: '18px' }}>
              {productos
                .filter((producto) => producto.tipo === 'Materia prima')
                .sort(
                  (a, b) =>
                    (Number(a.stock) || 0) - (Number(b.stock) || 0)
                )
                .slice(0, 6)
                .map((producto) => (
                  <div className="product-row" key={producto.id}>
                    <div className="product-symbol">MP</div>
                    <div className="product-description">
                      <strong>{producto.nombre}</strong>
                      <span>
                        {formatearNumero(producto.stock)} {producto.unidad}
                      </span>
                    </div>
                    <div className="stock-number">
                      <strong>
                        {formatearMoneda(
                          (Number(producto.stock) || 0) *
                            (Number(producto.costo) || 0)
                        )}
                      </strong>
                      <span>Valor</span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </section>
      </div>

      <section className="panel" style={{ marginTop: '18px' }}>
        <div className="panel-header">
          <div>
            <h2>Notas de interpretación</h2>
            <p>Para evitar confundir flujo de caja con rentabilidad.</p>
          </div>
        </div>

        <div style={{ padding: '20px', display: 'grid', gap: '10px' }}>
          <div className="product-row">
            <div className="product-symbol">1</div>
            <div className="product-description">
              <strong>Compras no son automáticamente costo de venta</strong>
              <span>
                Las compras se muestran como egresos de caja. El costo de ventas
                se estima desde las recetas y el costo actual de las materias primas.
              </span>
            </div>
          </div>

          <div className="product-row">
            <div className="product-symbol">2</div>
            <div className="product-description">
              <strong>La utilidad mostrada es estimada</strong>
              <span>
                Para una utilidad contable definitiva necesitaremos manejar el
                costo histórico de cada consumo y posteriormente gastos operativos.
              </span>
            </div>
          </div>

          <div className="product-row">
            <div className="product-symbol">3</div>
            <div className="product-description">
              <strong>El inventario se valoriza con el costo promedio actual</strong>
              <span>
                Esta valoración se actualizará con las entradas y el promedio
                ponderado que ya maneja el sistema.
              </span>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

export default Reportes

import { useMemo, useState } from 'react'

function Dashboard({
  productos = [],
  movimientos = [],
  recetas = [],
}) {
  const [periodo, setPeriodo] = useState('mes')

  const hoy = new Date()

  const formatearMoneda = (valor) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(Number(valor) || 0)

  const formatearNumero = (valor) =>
    Number(valor || 0).toLocaleString('es-CO', {
      maximumFractionDigits: 2,
    })

  const movimientosPeriodo = useMemo(() => {
    return movimientos.filter((movimiento) => {
      if (movimiento.tipo !== 'Entrada' && movimiento.tipo !== 'Salida') {
        return false
      }

      if (periodo === 'todos') return true

      const fecha = movimiento.fecha
        ? new Date(`${movimiento.fecha}T00:00:00`)
        : null

      if (!fecha || Number.isNaN(fecha.getTime())) return false

      if (periodo === 'hoy') {
        return (
          fecha.getDate() === hoy.getDate() &&
          fecha.getMonth() === hoy.getMonth() &&
          fecha.getFullYear() === hoy.getFullYear()
        )
      }

      if (periodo === 'semana') {
        const inicio = new Date(hoy)
        const dia = inicio.getDay() || 7
        inicio.setDate(inicio.getDate() - dia + 1)
        inicio.setHours(0, 0, 0, 0)

        const fin = new Date(inicio)
        fin.setDate(fin.getDate() + 7)

        return fecha >= inicio && fecha < fin
      }

      if (periodo === 'mes') {
        return (
          fecha.getMonth() === hoy.getMonth() &&
          fecha.getFullYear() === hoy.getFullYear()
        )
      }

      if (periodo === 'mesAnterior') {
        const anterior = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1)
        return (
          fecha.getMonth() === anterior.getMonth() &&
          fecha.getFullYear() === anterior.getFullYear()
        )
      }

      if (periodo === 'anio') {
        return fecha.getFullYear() === hoy.getFullYear()
      }

      return true
    })
  }, [movimientos, periodo])

  const datos = useMemo(() => {
    const ventas = movimientosPeriodo.filter((m) => m.tipo === 'Salida')
    const compras = movimientosPeriodo.filter((m) => m.tipo === 'Entrada')

    const ingresos = ventas.reduce(
      (total, m) => total + (Number(m.valorTotal) || 0),
      0
    )

    const egresos = compras.reduce(
      (total, m) =>
        total +
        (Number(m.costoTotal ?? m.valorFinanciero ?? m.valorTotal) || 0),
      0
    )

    const costoVentas = ventas.reduce(
      (total, m) => total + (Number(m.costoTotalHistorico) || 0),
      0
    )

    const utilidad = ingresos - costoVentas
    const margen = ingresos > 0 ? (utilidad / ingresos) * 100 : 0

    const caja = movimientosPeriodo.reduce((total, m) => {
      const valor = Number(m.valorFinanciero ?? m.valorTotal) || 0
      const efectivo = (m.formaPago || 'Efectivo') === 'Efectivo'
      if (!efectivo) return total
      return total + (m.tipo === 'Salida' ? valor : -valor)
    }, 0)

    const bancos = movimientosPeriodo.reduce((total, m) => {
      const valor = Number(m.valorFinanciero ?? m.valorTotal) || 0
      if (m.formaPago !== 'Transferencia') return total
      return total + (m.tipo === 'Salida' ? valor : -valor)
    }, 0)

    const stockBajo = productos.filter(
      (p) =>
        p.tipo === 'Materia prima' &&
        Number(p.stock) <= Number(p.stockMinimo)
    )

    const inventarioValor = productos
      .filter((p) => p.tipo === 'Materia prima')
      .reduce(
        (total, p) =>
          total + (Number(p.stock) || 0) * (Number(p.costo) || 0),
        0
      )

    const ventasProducto = productos
      .filter((p) => p.tipo === 'Producto Fitbar')
      .map((p) => {
        const ventasP = ventas.filter(
          (m) => Number(m.productoId) === Number(p.id)
        )
        const cantidad = ventasP.reduce(
          (total, m) => total + (Number(m.cantidad) || 0),
          0
        )
        const valor = ventasP.reduce(
          (total, m) => total + (Number(m.valorTotal) || 0),
          0
        )
        const costo = ventasP.reduce(
          (total, m) => total + (Number(m.costoTotalHistorico) || 0),
          0
        )

        return {
          ...p,
          cantidad,
          valor,
          costo,
          utilidad: valor - costo,
        }
      })
      .filter((p) => p.cantidad > 0)
      .sort((a, b) => b.valor - a.valor)

    const consumo = new Map()

    ventas.forEach((venta) => {
      ;(venta.consumos || []).forEach((item) => {
        const producto = productos.find(
          (p) => Number(p.id) === Number(item.productoId)
        )
        if (!producto) return

        const anterior = consumo.get(producto.id) || {
          id: producto.id,
          nombre: producto.nombre,
          unidad: producto.unidad,
          cantidad: 0,
        }

        anterior.cantidad += Number(item.cantidadConsumida) || 0
        consumo.set(producto.id, anterior)
      })
    })

    const materiasMasConsumidas = Array.from(consumo.values())
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 6)

    return {
      ventas,
      compras,
      ingresos,
      egresos,
      costoVentas,
      utilidad,
      margen,
      caja,
      bancos,
      stockBajo,
      inventarioValor,
      ventasProducto,
      materiasMasConsumidas,
    }
  }, [movimientosPeriodo, productos])

  const maxProducto = Math.max(
    ...datos.ventasProducto.map((p) => p.valor),
    1
  )

  const tituloPeriodo = {
    hoy: 'Hoy',
    semana: 'Esta semana',
    mes: 'Este mes',
    mesAnterior: 'Mes anterior',
    anio: 'Este año',
    todos: 'Todo el historial',
  }[periodo]

  return (
    <>
      <div className="page-header">
        <div>
          <span className="eyebrow">SOUL FIT · FITBAR</span>
          <h1>Dashboard Gerencial</h1>
          <p>
            Vista ejecutiva de ventas, rentabilidad, caja e inventario del Fitbar.
          </p>
        </div>

        <div style={{ minWidth: '190px' }}>
          <label>
            <span className="stat-label">Período</span>
            <select
              value={periodo}
              onChange={(event) => setPeriodo(event.target.value)}
            >
              <option value="hoy">Hoy</option>
              <option value="semana">Esta semana</option>
              <option value="mes">Este mes</option>
              <option value="mesAnterior">Mes anterior</option>
              <option value="anio">Este año</option>
              <option value="todos">Todo el historial</option>
            </select>
          </label>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-label">Ventas</span>
          <strong>{formatearMoneda(datos.ingresos)}</strong>
          <small>{datos.ventas.length} ventas · {tituloPeriodo}</small>
        </div>

        <div className="stat-card">
          <span className="stat-label">Costo de ventas</span>
          <strong>{formatearMoneda(datos.costoVentas)}</strong>
          <small>Costo histórico registrado</small>
        </div>

        <div className="stat-card">
          <span className="stat-label">Utilidad bruta</span>
          <strong>{formatearMoneda(datos.utilidad)}</strong>
          <small>Margen {formatearNumero(datos.margen)}%</small>
        </div>

        <div className="stat-card">
          <span className="stat-label">Caja + bancos</span>
          <strong>{formatearMoneda(datos.caja + datos.bancos)}</strong>
          <small>Caja {formatearMoneda(datos.caja)} · Bancos {formatearMoneda(datos.bancos)}</small>
        </div>
      </div>

      <div className="stats-grid" style={{ marginTop: '18px' }}>
        <div className="stat-card">
          <span className="stat-label">Compras</span>
          <strong>{formatearMoneda(datos.egresos)}</strong>
          <small>{datos.compras.length} entradas</small>
        </div>

        <div className="stat-card">
          <span className="stat-label">Inventario</span>
          <strong>{formatearMoneda(datos.inventarioValor)}</strong>
          <small>Valor estimado de materias primas</small>
        </div>

        <div className="stat-card">
          <span className="stat-label">Productos vendidos</span>
          <strong>{datos.ventasProducto.length}</strong>
          <small>Productos con movimiento</small>
        </div>

        <div className="stat-card">
          <span className="stat-label">Alertas de stock</span>
          <strong>{datos.stockBajo.length}</strong>
          <small>Materias primas para revisar</small>
        </div>
      </div>

      <div className="dashboard-two-columns" style={{ marginTop: '18px' }}>
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Top productos por ventas</h2>
              <p>Los productos que más ingresos generan en el período.</p>
            </div>
          </div>

          {datos.ventasProducto.length === 0 ? (
            <div className="empty-state">
              <strong>No hay ventas en el período</strong>
              <span>Registra ventas para comenzar a alimentar el dashboard.</span>
            </div>
          ) : (
            <div style={{ padding: '20px' }}>
              {datos.ventasProducto.slice(0, 6).map((producto, index) => (
                <div key={producto.id} style={{ marginBottom: '20px' }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: '12px',
                      marginBottom: '7px',
                    }}
                  >
                    <strong>
                      {index + 1}. {producto.nombre}
                    </strong>
                    <strong>{formatearMoneda(producto.valor)}</strong>
                  </div>

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
                        width: `${(producto.valor / maxProducto) * 100}%`,
                        height: '100%',
                        background: 'var(--primary, #17211d)',
                      }}
                    />
                  </div>

                  <small>
                    {formatearNumero(producto.cantidad)} und · Utilidad{' '}
                    {formatearMoneda(producto.utilidad)}
                  </small>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Rentabilidad</h2>
              <p>Lectura rápida del desempeño del período.</p>
            </div>
          </div>

          <div style={{ padding: '20px' }}>
            <div className="recipe-summary">
              <div>
                <span>Ventas</span>
                <strong>{formatearMoneda(datos.ingresos)}</strong>
              </div>
              <div className="recipe-summary-info">
                <span>Costo de ventas</span>
                <strong>{formatearMoneda(datos.costoVentas)}</strong>
              </div>
            </div>

            <div className="recipe-summary">
              <div>
                <span>Utilidad bruta</span>
                <strong>{formatearMoneda(datos.utilidad)}</strong>
              </div>
              <div className="recipe-summary-info">
                <span>Margen bruto</span>
                <strong>{formatearNumero(datos.margen)}%</strong>
              </div>
            </div>

            <div className="product-list" style={{ marginTop: '18px' }}>
              <div className="product-row">
                <div className="product-symbol">EF</div>
                <div className="product-description">
                  <strong>Caja</strong>
                  <span>Movimientos en efectivo</span>
                </div>
                <div className="stock-number">
                  <strong>{formatearMoneda(datos.caja)}</strong>
                  <span>Saldo</span>
                </div>
              </div>

              <div className="product-row">
                <div className="product-symbol">TR</div>
                <div className="product-description">
                  <strong>Bancos</strong>
                  <span>Movimientos por transferencia</span>
                </div>
                <div className="stock-number">
                  <strong>{formatearMoneda(datos.bancos)}</strong>
                  <span>Saldo</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="dashboard-two-columns" style={{ marginTop: '18px' }}>
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Alertas de inventario</h2>
              <p>Materias primas que están en el mínimo o por debajo.</p>
            </div>
            <span className="status status-warning">
              {datos.stockBajo.length} alertas
            </span>
          </div>

          {datos.stockBajo.length === 0 ? (
            <div className="empty-state">
              <strong>Inventario saludable</strong>
              <span>No hay materias primas por debajo del mínimo.</span>
            </div>
          ) : (
            <div className="product-list">
              {datos.stockBajo.slice(0, 6).map((producto) => (
                <div className="product-row" key={producto.id}>
                  <div className="product-symbol">MP</div>
                  <div className="product-description">
                    <strong>{producto.nombre}</strong>
                    <span>
                      Mínimo {formatearNumero(producto.stockMinimo)} {producto.unidad}
                    </span>
                  </div>
                  <div className="stock-number">
                    <strong>
                      {formatearNumero(producto.stock)} {producto.unidad}
                    </strong>
                    <span>Stock actual</span>
                  </div>
                  <span className="status status-warning">Revisar</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Materias primas más consumidas</h2>
              <p>Consumo generado automáticamente por las ventas.</p>
            </div>
          </div>

          {datos.materiasMasConsumidas.length === 0 ? (
            <div className="empty-state">
              <strong>Sin consumo registrado</strong>
              <span>Las ventas con receta alimentarán este indicador.</span>
            </div>
          ) : (
            <div className="product-list">
              {datos.materiasMasConsumidas.map((materia) => (
                <div className="product-row" key={materia.id}>
                  <div className="product-symbol">MP</div>
                  <div className="product-description">
                    <strong>{materia.nombre}</strong>
                    <span>Consumo por ventas</span>
                  </div>
                  <div className="stock-number">
                    <strong>
                      {formatearNumero(materia.cantidad)} {materia.unidad}
                    </strong>
                    <span>Consumido</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="panel" style={{ marginTop: '18px' }}>
        <div className="panel-header">
          <div>
            <h2>Flujo operativo del Fitbar</h2>
            <p>La información del dashboard se alimenta de los módulos del sistema.</p>
          </div>
        </div>

        <div className="flow">
          <div className="flow-item">
            <span>1</span>
            <div>
              <strong>Compra</strong>
              <small>Entrada y costo de materia prima</small>
            </div>
          </div>

          <div className="flow-line"></div>

          <div className="flow-item">
            <span>2</span>
            <div>
              <strong>Receta</strong>
              <small>Fórmula y cantidades por producto</small>
            </div>
          </div>

          <div className="flow-line"></div>

          <div className="flow-item">
            <span>3</span>
            <div>
              <strong>Venta</strong>
              <small>Ingreso y forma de pago</small>
            </div>
          </div>

          <div className="flow-line"></div>

          <div className="flow-item">
            <span>4</span>
            <div>
              <strong>Control</strong>
              <small>Inventario, finanzas y rentabilidad</small>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

export default Dashboard

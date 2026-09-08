import { useMemo, useState } from 'react'

function Kardex({
  productos = [],
  productosIniciales = [],
  movimientos = [],
}) {
  const materiasPrimas = useMemo(
    () => productos.filter((producto) => producto.tipo === 'Materia prima'),
    [productos]
  )

  const [productoId, setProductoId] = useState('')

  const productoSeleccionado = materiasPrimas.find(
    (producto) => producto.id === Number(productoId)
  )

  const stockInicial = useMemo(() => {
    if (!productoSeleccionado) return 0

    const inicial = productosIniciales.find(
      (producto) => producto.id === productoSeleccionado.id
    )

    return Number(inicial?.stock) || 0
  }, [productoSeleccionado, productosIniciales])

  const movimientosKardex = useMemo(() => {
    if (!productoSeleccionado) return []

    const filas = []

    movimientos.forEach((movimiento, movimientoIndex) => {
      if (movimiento.tipo === 'Entrada') {
        if (Number(movimiento.productoId) !== productoSeleccionado.id) return

        filas.push({
          id: `entrada-${movimiento.id || movimientoIndex}`,
          fecha: movimiento.fecha,
          orden: movimientoIndex,
          tipo: 'Entrada',
          detalle: movimiento.proveedor
            ? `Compra · ${movimiento.proveedor}`
            : 'Entrada de inventario',
          referencia: movimiento.observacion || '—',
          entrada: Number(movimiento.cantidad) || 0,
          salida: 0,
          costoUnitario: Number(movimiento.costoUnitario) || 0,
          valor: Number(movimiento.valorTotal ?? movimiento.costoTotal) || 0,
          formaPago: movimiento.formaPago || 'Efectivo',
        })
      }

      if (movimiento.tipo === 'Salida') {
        const consumo = (movimiento.consumos || []).find(
          (item) => Number(item.productoId) === productoSeleccionado.id
        )

        if (!consumo) return

        const cantidad = Number(consumo.cantidadConsumida) || 0
        const costoUnitario =
          Number(consumo.costoUnitarioHistorico) ||
          Number(productoSeleccionado.costo) ||
          0

        filas.push({
          id: `salida-${movimiento.id || movimientoIndex}-${productoSeleccionado.id}`,
          fecha: movimiento.fecha,
          orden: movimientoIndex,
          tipo: 'Salida',
          detalle: movimiento.producto
            ? `Venta · ${movimiento.producto}`
            : 'Consumo por venta',
          referencia: movimiento.observacion || '—',
          entrada: 0,
          salida: cantidad,
          costoUnitario,
          valor:
            Number(consumo.costoTotalHistorico) ||
            cantidad * costoUnitario,
          formaPago: movimiento.formaPago || 'Efectivo',
        })
      }
    })

    return filas.sort((a, b) => {
      const fechaA = new Date(`${a.fecha}T00:00:00`).getTime()
      const fechaB = new Date(`${b.fecha}T00:00:00`).getTime()

      if (fechaA !== fechaB) return fechaA - fechaB
      return a.orden - b.orden
    })
  }, [productoSeleccionado, movimientos])

  const filasConSaldo = useMemo(() => {
    let saldo = stockInicial

    return movimientosKardex.map((movimiento) => {
      saldo += movimiento.entrada
      saldo -= movimiento.salida

      return {
        ...movimiento,
        saldo,
      }
    })
  }, [movimientosKardex, stockInicial])

  const saldoCalculado = filasConSaldo.length
    ? filasConSaldo[filasConSaldo.length - 1].saldo
    : stockInicial

  const totalEntradas = filasConSaldo.reduce(
    (total, movimiento) => total + movimiento.entrada,
    0
  )

  const totalSalidas = filasConSaldo.reduce(
    (total, movimiento) => total + movimiento.salida,
    0
  )

  const valorActualInventario =
    Number(productoSeleccionado?.stock || 0) *
    Number(productoSeleccionado?.costo || 0)

  const diferenciaSistema = saldoCalculado - Number(productoSeleccionado?.stock || 0)

  const estadoStock =
    Number(productoSeleccionado?.stock || 0) <=
    Number(productoSeleccionado?.stockMinimo || 0)
      ? 'Bajo'
      : 'Normal'

  const formatearNumero = (valor) =>
    Number(valor || 0).toLocaleString('es-CO', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })

  const formatearMoneda = (valor) =>
    Number(valor || 0).toLocaleString('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    })

  const formatearFecha = (fecha) => {
    if (!fecha) return 'Inicial'

    const [anio, mes, dia] = fecha.split('-')
    return `${dia}/${mes}/${anio}`
  }

  return (
    <div className="kardex-page">
      <header className="kardex-header">
        <div>
          <span className="kardex-eyebrow">CONTROL · INVENTARIO</span>
          <h1>Kardex</h1>
          <p>Consulta el movimiento detallado de cada materia prima y su saldo acumulado.</p>
        </div>

        <div className="kardex-header-badge">
          <span className="kardex-badge-icon">≡</span>
          <div>
            <strong>{materiasPrimas.length}</strong>
            <span>materias primas</span>
          </div>
        </div>
      </header>

      <section className="kardex-selector-card">
        <div className="kardex-selector-copy">
          <span className="kardex-section-label">CONSULTA DE MOVIMIENTOS</span>
          <h2>Selecciona una materia prima</h2>
          <p>El Kardex muestra cómo se construye el saldo desde el inventario inicial.</p>
        </div>

        <div className="kardex-selector-control">
          <label>Materia prima</label>
          <select
            value={productoId}
            onChange={(event) => setProductoId(event.target.value)}
          >
            <option value="">Selecciona una materia prima...</option>
            {materiasPrimas.map((producto) => (
              <option key={producto.id} value={producto.id}>
                {producto.codigo ? `${producto.codigo} · ` : ''}
                {producto.nombre}
              </option>
            ))}
          </select>
        </div>
      </section>

      {!productoSeleccionado ? (
        <section className="kardex-empty-card">
          <div className="kardex-empty-icon">≡</div>
          <strong>Selecciona una materia prima para comenzar</strong>
          <p>
            Aquí podrás revisar entradas, consumos, costos y el saldo acumulado
            de cada ingrediente.
          </p>
        </section>
      ) : (
        <>
          <section className="kardex-product-strip">
            <div className="kardex-product-avatar">MP</div>
            <div className="kardex-product-copy">
              <span>{productoSeleccionado.codigo || 'SIN CÓDIGO'}</span>
              <strong>{productoSeleccionado.nombre}</strong>
            </div>
            <div className="kardex-product-meta">
              <span>Unidad</span>
              <strong>{productoSeleccionado.unidad}</strong>
            </div>
            <div className="kardex-product-meta">
              <span>Costo actual</span>
              <strong>
                {productoSeleccionado.costo > 0
                  ? formatearMoneda(productoSeleccionado.costo)
                  : 'Costo pendiente'}
              </strong>
            </div>
            <span className={`kardex-status ${estadoStock === 'Bajo' ? 'warning' : 'ok'}`}>
              <i />
              {estadoStock === 'Bajo' ? 'Stock bajo' : 'Stock normal'}
            </span>
          </section>

          <section className="kardex-kpis">
            <article className="kardex-kpi">
              <span className="kardex-kpi-icon neutral">01</span>
              <div>
                <span>Saldo inicial</span>
                <strong>{formatearNumero(stockInicial)}</strong>
                <small>{productoSeleccionado.unidad}</small>
              </div>
            </article>

            <article className="kardex-kpi">
              <span className="kardex-kpi-icon entry">↑</span>
              <div>
                <span>Total entradas</span>
                <strong>+{formatearNumero(totalEntradas)}</strong>
                <small>{productoSeleccionado.unidad} recibidos</small>
              </div>
            </article>

            <article className="kardex-kpi">
              <span className="kardex-kpi-icon exit">↓</span>
              <div>
                <span>Total salidas</span>
                <strong>-{formatearNumero(totalSalidas)}</strong>
                <small>{productoSeleccionado.unidad} consumidos</small>
              </div>
            </article>

            <article className="kardex-kpi featured">
              <span className="kardex-kpi-icon stock">✓</span>
              <div>
                <span>Saldo actual</span>
                <strong>{formatearNumero(saldoCalculado)}</strong>
                <small>{productoSeleccionado.unidad} según Kardex</small>
              </div>
            </article>

            <article className="kardex-kpi">
              <span className="kardex-kpi-icon money">$</span>
              <div>
                <span>Valor inventario</span>
                <strong>
                  {productoSeleccionado.costo > 0
                    ? formatearMoneda(valorActualInventario)
                    : 'Pendiente'}
                </strong>
                <small>Stock × costo actual</small>
              </div>
            </article>
          </section>

          <section className="kardex-card">
            <div className="kardex-card-heading">
              <div>
                <span className="kardex-section-label">DETALLE CRONOLÓGICO</span>
                <h2>Movimientos del inventario</h2>
                <p>
                  Saldo inicial + entradas − salidas = saldo acumulado.
                </p>
              </div>

              <div className="kardex-heading-summary">
                <span>Stock sistema</span>
                <strong>
                  {formatearNumero(productoSeleccionado.stock)} {productoSeleccionado.unidad}
                </strong>
              </div>
            </div>

            {filasConSaldo.length === 0 ? (
              <div className="kardex-no-movements">
                <div>—</div>
                <strong>No hay movimientos registrados</strong>
                <p>
                  Las entradas y consumos de esta materia prima aparecerán aquí
                  cuando se registren.
                </p>
              </div>
            ) : (
              <div className="kardex-table-wrap">
                <table className="kardex-table">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Movimiento</th>
                      <th>Detalle</th>
                      <th>Entrada</th>
                      <th>Salida</th>
                      <th>Saldo</th>
                      <th>Costo unit.</th>
                      <th>Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="initial-row">
                      <td>Inicial</td>
                      <td>
                        <span className="kardex-type initial">Inicial</span>
                      </td>
                      <td>
                        <strong>Inventario inicial</strong>
                        <small>Saldo de apertura</small>
                      </td>
                      <td>—</td>
                      <td>—</td>
                      <td>
                        <strong>
                          {formatearNumero(stockInicial)} {productoSeleccionado.unidad}
                        </strong>
                      </td>
                      <td>—</td>
                      <td>—</td>
                    </tr>

                    {filasConSaldo.map((movimiento) => (
                      <tr key={movimiento.id}>
                        <td>{formatearFecha(movimiento.fecha)}</td>
                        <td>
                          <span
                            className={`kardex-type ${
                              movimiento.tipo === 'Entrada' ? 'entry' : 'exit'
                            }`}
                          >
                            {movimiento.tipo}
                          </span>
                        </td>
                        <td>
                          <strong>{movimiento.detalle}</strong>
                          <small>{movimiento.referencia}</small>
                        </td>
                        <td className="entry-value">
                          {movimiento.entrada > 0
                            ? `+${formatearNumero(movimiento.entrada)} ${productoSeleccionado.unidad}`
                            : '—'}
                        </td>
                        <td className="exit-value">
                          {movimiento.salida > 0
                            ? `-${formatearNumero(movimiento.salida)} ${productoSeleccionado.unidad}`
                            : '—'}
                        </td>
                        <td>
                          <strong>
                            {formatearNumero(movimiento.saldo)} {productoSeleccionado.unidad}
                          </strong>
                        </td>
                        <td>
                          {movimiento.costoUnitario > 0
                            ? formatearMoneda(movimiento.costoUnitario)
                            : 'Pendiente'}
                        </td>
                        <td>
                          {movimiento.valor > 0
                            ? formatearMoneda(movimiento.valor)
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="kardex-control-footer">
              <div>
                <span>Conciliación del saldo</span>
                <strong>
                  {formatearNumero(saldoCalculado)} {productoSeleccionado.unidad}
                </strong>
              </div>

              <div className={`kardex-reconciliation ${diferenciaSistema === 0 ? 'ok' : 'warning'}`}>
                <span>{diferenciaSistema === 0 ? '✓' : '!'}</span>
                <div>
                  <strong>
                    {diferenciaSistema === 0
                      ? 'Kardex conciliado con el stock del sistema'
                      : 'Revisar diferencia de saldo'}
                  </strong>
                  <small>
                    {diferenciaSistema === 0
                      ? 'No se detectan diferencias entre los movimientos y el stock actual.'
                      : `Diferencia: ${formatearNumero(diferenciaSistema)} ${productoSeleccionado.unidad}`}
                  </small>
                </div>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  )
}

export default Kardex

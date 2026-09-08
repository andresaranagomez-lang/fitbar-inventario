import { useMemo, useState } from 'react'

function Salidas({
  productos = [],
  recetas = [],
  movimientos = [],
  onRegistrarSalida,
}) {
  const productosFitbar = useMemo(
    () => productos.filter((producto) => producto.tipo === 'Producto Fitbar'),
    [productos]
  )

  const [formulario, setFormulario] = useState({
    fecha: new Date().toISOString().split('T')[0],
    productoId: '',
    cantidad: '',
    precioVenta: '',
    formaPago: 'Efectivo',
    observacion: '',
  })

  const productoSeleccionado = productosFitbar.find(
    (producto) => producto.id === Number(formulario.productoId)
  )

  const recetaSeleccionada = recetas.find(
    (receta) => receta.productoId === Number(formulario.productoId)
  )

  const cantidadVendida = Number(formulario.cantidad) || 0
  const precioVenta = Number(formulario.precioVenta) || 0
  const valorTotal = cantidadVendida * precioVenta

  const consumos = useMemo(() => {
    if (!recetaSeleccionada || cantidadVendida <= 0) return []

    return recetaSeleccionada.ingredientes.map((ingrediente) => {
      const materiaPrima = productos.find(
        (producto) => producto.id === Number(ingrediente.productoId)
      )

      const cantidadPorUnidad = Number(ingrediente.cantidad) || 0
      const cantidadNecesaria = cantidadPorUnidad * cantidadVendida
      const stockActual = Number(materiaPrima?.stock) || 0

      return {
        ...ingrediente,
        nombre: materiaPrima?.nombre || 'Ingrediente no encontrado',
        codigo: materiaPrima?.codigo || '',
        unidad: materiaPrima?.unidad || '',
        cantidadPorUnidad,
        cantidadNecesaria,
        stockActual,
        suficiente: stockActual >= cantidadNecesaria,
      }
    })
  }, [recetaSeleccionada, cantidadVendida, productos])

  const salidas = useMemo(
    () =>
      movimientos
        .filter((movimiento) => movimiento.tipo === 'Salida')
        .slice()
        .reverse(),
    [movimientos]
  )

  const ventasTotales = salidas.reduce(
    (total, salida) => total + Number(salida.valorTotal ?? salida.valorFinanciero ?? 0),
    0
  )

  const unidadesVendidas = salidas.reduce(
    (total, salida) => total + Number(salida.cantidad || 0),
    0
  )

  const ventasEfectivo = salidas
    .filter((salida) => (salida.formaPago || 'Efectivo') === 'Efectivo')
    .reduce(
      (total, salida) => total + Number(salida.valorTotal ?? salida.valorFinanciero ?? 0),
      0
    )

  const actualizarCampo = (campo, valor) => {
    setFormulario((actual) => ({
      ...actual,
      [campo]: valor,
    }))
  }

  const limpiarFormulario = () => {
    setFormulario({
      fecha: new Date().toISOString().split('T')[0],
      productoId: '',
      cantidad: '',
      precioVenta: '',
      formaPago: 'Efectivo',
      observacion: '',
    })
  }

  const registrarSalida = (event) => {
    event.preventDefault()

    if (!formulario.productoId) {
      alert('Selecciona el producto Fitbar.')
      return
    }

    if (cantidadVendida <= 0) {
      alert('Ingresa una cantidad vendida mayor que cero.')
      return
    }

    if (precioVenta <= 0) {
      alert('Ingresa un precio de venta mayor que cero.')
      return
    }

    if (!formulario.formaPago) {
      alert('Selecciona la forma de pago.')
      return
    }

    if (!recetaSeleccionada) {
      alert(
        'El producto seleccionado no tiene una receta guardada. Primero configura su receta.'
      )
      return
    }

    if (consumos.some((consumo) => !consumo.suficiente)) {
      const faltantes = consumos
        .filter((consumo) => !consumo.suficiente)
        .map(
          (consumo) =>
            `• ${consumo.nombre}: faltan ${formatearNumero(
              consumo.cantidadNecesaria - consumo.stockActual
            )} ${consumo.unidad}`
        )
        .join('\n')

      alert(`No hay inventario suficiente:\n\n${faltantes}`)
      return
    }

    const nuevaSalida = {
      id: Date.now(),
      tipo: 'Salida',
      fecha: formulario.fecha,
      productoId: Number(formulario.productoId),
      producto: productoSeleccionado?.nombre || '',
      codigo: productoSeleccionado?.codigo || '',
      cantidad: cantidadVendida,
      unidad: productoSeleccionado?.unidad || 'und',
      precioVenta,
      valorTotal,
      formaPago: formulario.formaPago,
      naturaleza: 'Ingreso por venta',
      naturalezaFinanciera: 'Ingreso',
      valorFinanciero: valorTotal,
      observacion: formulario.observacion.trim(),
    }

    const registrada = onRegistrarSalida?.(nuevaSalida)

    if (registrada === false) return

    alert(
      `Salida registrada correctamente.\n\n` +
        `${cantidadVendida} ${productoSeleccionado?.nombre} descontado(s) ` +
        `del inventario según su receta.\n` +
        `Forma de pago: ${formulario.formaPago}.`
    )

    limpiarFormulario()
  }

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

  const consumoTotalVisible = consumos.reduce(
    (total, consumo) => total + Number(consumo.cantidadNecesaria || 0),
    0
  )

  return (
    <div className="salidas-page">
      <header className="salidas-header">
        <div>
          <span className="salidas-eyebrow">MOVIMIENTOS · FITBAR</span>
          <h1>Salidas y ventas</h1>
          <p>Registra las ventas y descuenta automáticamente las materias primas según la receta.</p>
        </div>

        <div className="salidas-header-badge">
          <span className="salidas-badge-icon">↗</span>
          <div>
            <strong>{salidas.length}</strong>
            <span>ventas registradas</span>
          </div>
        </div>
      </header>

      <section className="salidas-kpis">
        <article className="salida-kpi">
          <span className="salida-kpi-icon">$</span>
          <div>
            <span>Ventas registradas</span>
            <strong>{formatearMoneda(ventasTotales)}</strong>
          </div>
        </article>

        <article className="salida-kpi">
          <span className="salida-kpi-icon">#</span>
          <div>
            <span>Unidades vendidas</span>
            <strong>{formatearNumero(unidadesVendidas)}</strong>
          </div>
        </article>

        <article className="salida-kpi">
          <span className="salida-kpi-icon">MP</span>
          <div>
            <span>Productos Fitbar</span>
            <strong>{productosFitbar.length}</strong>
          </div>
        </article>

        <article className="salida-kpi">
          <span className="salida-kpi-icon">EF</span>
          <div>
            <span>Ventas en efectivo</span>
            <strong>{formatearMoneda(ventasEfectivo)}</strong>
          </div>
        </article>
      </section>

      <div className="salidas-main-grid">
        <section className="salida-card salida-form-card">
          <div className="salida-card-heading">
            <div>
              <span className="salida-section-label">NUEVO MOVIMIENTO</span>
              <h2>Registrar venta</h2>
              <p>Selecciona el producto, cantidad y precio de venta.</p>
            </div>

            <span className="salida-live-status">
              <i />
              Venta
            </span>
          </div>

          <form onSubmit={registrarSalida} className="salida-form">
            <div className="salida-form-section">
              <div className="salida-form-section-title">
                <span>01</span>
                <div>
                  <strong>Información de la venta</strong>
                  <small>El producto determinará automáticamente la receta.</small>
                </div>
              </div>

              <div className="salida-fields salida-fields-top">
                <label className="salida-field">
                  <span>Fecha</span>
                  <input
                    type="date"
                    value={formulario.fecha}
                    onChange={(event) => actualizarCampo('fecha', event.target.value)}
                  />
                </label>

                <label className="salida-field salida-field-wide">
                  <span>Producto Fitbar <b>*</b></span>
                  <select
                    value={formulario.productoId}
                    onChange={(event) => actualizarCampo('productoId', event.target.value)}
                  >
                    <option value="">Selecciona un producto...</option>
                    {productosFitbar.map((producto) => (
                      <option key={producto.id} value={producto.id}>
                        {producto.codigo ? `${producto.codigo} · ` : ''}{producto.nombre}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className={`salida-selected-product ${productoSeleccionado ? 'active' : ''}`}>
                {productoSeleccionado ? (
                  <>
                    <div className="salida-selected-avatar">PF</div>
                    <div className="salida-selected-copy">
                      <strong>{productoSeleccionado.nombre}</strong>
                      <span>{productoSeleccionado.codigo || 'Sin código'} · Producto Fitbar</span>
                    </div>
                    <div className={`salida-recipe-state ${recetaSeleccionada ? 'ready' : 'missing'}`}>
                      <span>{recetaSeleccionada ? '✓' : '!'}</span>
                      {recetaSeleccionada ? 'Receta configurada' : 'Sin receta'}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="salida-selected-avatar muted">PF</div>
                    <div className="salida-selected-copy muted-copy">
                      <strong>Selecciona un producto Fitbar</strong>
                      <span>Su receta y consumo aparecerán aquí.</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="salida-form-section">
              <div className="salida-form-section-title">
                <span>02</span>
                <div>
                  <strong>Cantidad y precio</strong>
                  <small>Define el valor de venta por unidad.</small>
                </div>
              </div>

              <div className="salida-fields salida-fields-sale">
                <label className="salida-field">
                  <span>Cantidad vendida <b>*</b></span>
                  <div className="salida-input-suffix">
                    <input
                      type="number"
                      min="1"
                      step="1"
                      placeholder="0"
                      value={formulario.cantidad}
                      onChange={(event) => actualizarCampo('cantidad', event.target.value)}
                    />
                    <em>und</em>
                  </div>
                </label>

                <label className="salida-field">
                  <span>Precio de venta por unidad <b>*</b></span>
                  <div className="salida-input-prefix">
                    <em>$</em>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="0"
                      value={formulario.precioVenta}
                      onChange={(event) => actualizarCampo('precioVenta', event.target.value)}
                    />
                  </div>
                </label>

                <div className="salida-total-calculated">
                  <span>Total de la venta</span>
                  <strong>{formatearMoneda(valorTotal)}</strong>
                  <em>{cantidadVendida > 0 ? `${formatearNumero(cantidadVendida)} × ${formatearMoneda(precioVenta)}` : 'Se calcula automáticamente'}</em>
                </div>
              </div>
            </div>

            <div className="salida-form-section">
              <div className="salida-form-section-title">
                <span>03</span>
                <div>
                  <strong>Pago y soporte</strong>
                  <small>Información complementaria del movimiento.</small>
                </div>
              </div>

              <div className="salida-fields salida-fields-bottom">
                <label className="salida-field">
                  <span>Forma de pago</span>
                  <select
                    value={formulario.formaPago}
                    onChange={(event) => actualizarCampo('formaPago', event.target.value)}
                  >
                    <option value="Efectivo">Efectivo</option>
                    <option value="Transferencia">Transferencia</option>
                  </select>
                </label>

                <label className="salida-field salida-field-wide">
                  <span>Observación</span>
                  <input
                    type="text"
                    placeholder="Ej. venta mostrador"
                    value={formulario.observacion}
                    onChange={(event) => actualizarCampo('observacion', event.target.value)}
                  />
                </label>
              </div>
            </div>

            <div className="salida-action-bar">
              <div>
                <span>Ingreso que se registrará</span>
                <strong>{formatearMoneda(valorTotal)}</strong>
              </div>
              <div className="salida-actions">
                <button type="button" className="salida-btn secondary" onClick={limpiarFormulario}>
                  Limpiar
                </button>
                <button type="submit" className="salida-btn primary">
                  Registrar venta <span>→</span>
                </button>
              </div>
            </div>
          </form>
        </section>

        <aside className="salida-card salida-preview-card">
          <div className="salida-card-heading compact-heading">
            <div>
              <span className="salida-section-label">CONTROL DE INVENTARIO</span>
              <h2>Consumo de ingredientes</h2>
            </div>
          </div>

          {!formulario.productoId ? (
            <div className="salida-preview-empty">
              <div className="salida-empty-icon">↓</div>
              <strong>Selecciona un producto</strong>
              <p>La receta y el consumo de materias primas aparecerán automáticamente aquí.</p>
            </div>
          ) : !recetaSeleccionada ? (
            <div className="salida-preview-empty warning">
              <div className="salida-empty-icon">!</div>
              <strong>Este producto no tiene receta</strong>
              <p>Configura primero la receta en el módulo <b>Recetas</b> para poder registrar su salida.</p>
            </div>
          ) : (
            <>
              <div className="salida-preview-product">
                <div className="salida-preview-avatar">PF</div>
                <div>
                  <strong>{productoSeleccionado?.nombre}</strong>
                  <span>{recetaSeleccionada.ingredientes.length} ingrediente(s) · {formatearNumero(cantidadVendida)} unidad(es)</span>
                </div>
              </div>

              <div className="salida-consumption-summary">
                <div>
                  <span>Ingredientes</span>
                  <strong>{consumos.length}</strong>
                </div>
                <div>
                  <span>Consumo calculado</span>
                  <strong>{formatearNumero(consumoTotalVisible)}</strong>
                </div>
              </div>

              <div className="salida-ingredients">
                {consumos.map((consumo, index) => (
                  <div className="salida-ingredient-row" key={consumo.productoId}>
                    <div className="salida-ingredient-number">{String(index + 1).padStart(2, '0')}</div>
                    <div className="salida-ingredient-main">
                      <strong>{consumo.nombre}</strong>
                      <span>{formatearNumero(consumo.cantidadPorUnidad)} {consumo.unidad} / unidad</span>
                    </div>
                    <div className="salida-ingredient-consumption">
                      <strong>-{formatearNumero(consumo.cantidadNecesaria)}</strong>
                      <span>{consumo.unidad}</span>
                    </div>
                    <span className={`salida-stock-status ${consumo.suficiente ? 'ok' : 'danger'}`}>
                      {consumo.suficiente ? 'OK' : 'Falta'}
                    </span>
                  </div>
                ))}
              </div>

              <div className="salida-preview-note">
                <span>✓</span>
                <p>Al registrar la venta, estos consumos se descontarán automáticamente del inventario. El sistema validará que exista stock suficiente.</p>
              </div>
            </>
          )}
        </aside>
      </div>

      <section className="salida-card salida-history-card">
        <div className="salida-card-heading">
          <div>
            <span className="salida-section-label">HISTORIAL</span>
            <h2>Últimas ventas</h2>
            <p>Ventas registradas y enviadas al movimiento financiero como ingresos.</p>
          </div>
          <span className="salida-history-count">{salidas.length} registros</span>
        </div>

        {salidas.length === 0 ? (
          <div className="salida-history-empty">
            <span>↓</span>
            <strong>Aún no hay ventas registradas</strong>
            <p>Las ventas que registres aparecerán aquí automáticamente.</p>
          </div>
        ) : (
          <div className="salida-table-wrap">
            <table className="salida-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Producto</th>
                  <th>Cantidad</th>
                  <th>Precio unitario</th>
                  <th>Total</th>
                  <th>Forma de pago</th>
                  <th>Observación</th>
                </tr>
              </thead>
              <tbody>
                {salidas.map((salida) => (
                  <tr key={salida.id}>
                    <td>{salida.fecha}</td>
                    <td>
                      <div className="salida-table-product">
                        <span>PF</span>
                        <div>
                          <strong>{salida.producto}</strong>
                          <small>{salida.codigo || 'Sin código'}</small>
                        </div>
                      </div>
                    </td>
                    <td>{formatearNumero(salida.cantidad)} {salida.unidad}</td>
                    <td>{formatearMoneda(salida.precioVenta)}</td>
                    <td><strong>{formatearMoneda(salida.valorTotal)}</strong></td>
                    <td>
                      <span className={`salida-payment ${salida.formaPago === 'Transferencia' ? 'transfer' : ''}`}>
                        {salida.formaPago || 'Efectivo'}
                      </span>
                    </td>
                    <td>{salida.observacion || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

export default Salidas

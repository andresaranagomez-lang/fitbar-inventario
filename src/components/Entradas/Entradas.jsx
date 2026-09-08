import { useMemo, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

function Entradas({
  productos = [],
  onRegistrarEntrada,
  movimientos = [],
}) {
  const materiasPrimas = useMemo(
    () => productos.filter((producto) => producto.tipo === 'Materia prima'),
    [productos]
  )

  const [guardando, setGuardando] = useState(false)

  const [formulario, setFormulario] = useState({
    fecha: new Date().toISOString().split('T')[0],
    productoId: '',
    cantidad: '',
    costoTotal: '',
    proveedor: '',
    formaPago: 'Efectivo',
    observacion: '',
  })

  const productoSeleccionado = materiasPrimas.find(
    (producto) => producto.id === Number(formulario.productoId)
  )

  const cantidad = Number(formulario.cantidad) || 0
  const costoTotal = Number(formulario.costoTotal) || 0
  const costoUnitario = cantidad > 0 ? costoTotal / cantidad : 0

  const entradas = movimientos.filter(
    (movimiento) => movimiento.tipo === 'Entrada'
  )

  const totalCompras = entradas.reduce(
    (total, entrada) => total + Number(entrada.costoTotal ?? entrada.valorTotal ?? 0),
    0
  )

  const cantidadEntradas = entradas.length
  const ultimaEntrada = entradas.length
    ? entradas.slice().sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)))[0]
    : null

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
      costoTotal: '',
      proveedor: '',
      formaPago: 'Efectivo',
      observacion: '',
    })
  }

  const registrarEntrada = async (event) => {
    event.preventDefault()

    if (guardando) return

    if (!formulario.productoId) {
      alert('Selecciona la materia prima.')
      return
    }

    if (cantidad <= 0) {
      alert('Ingresa una cantidad mayor que cero.')
      return
    }

    if (costoTotal < 0) {
      alert('El costo total no puede ser negativo.')
      return
    }

    if (!productoSeleccionado) {
      alert('No fue posible identificar la materia prima seleccionada.')
      return
    }

    setGuardando(true)

    try {
      const { data: usuarioData, error: usuarioError } = await supabase.auth.getUser()

      if (usuarioError || !usuarioData?.user) {
        throw new Error('No se pudo identificar el usuario de la sesión.')
      }

      const { data, error } = await supabase.rpc('registrar_entrada', {
        p_fecha: formulario.fecha,
        p_producto_id: Number(formulario.productoId),
        p_cantidad: cantidad,
        p_costo_total: costoTotal,
        p_proveedor: formulario.proveedor.trim(),
        p_observacion: formulario.observacion.trim(),
        p_forma_pago: formulario.formaPago,
        p_usuario_id: usuarioData.user.id,
      })

      if (error) {
        console.error('Error registrando entrada en Supabase:', error)
        throw new Error(error.message || 'No fue posible registrar la entrada.')
      }

      const resultado = data || {}
      const stockAnterior = Number(
        resultado.stock_anterior ?? productoSeleccionado.stock ?? 0
      )
      const stockNuevo = Number(
        resultado.stock_nuevo ?? stockAnterior + cantidad
      )
      const costoAnterior = Number(
        resultado.costo_anterior ?? productoSeleccionado.costo ?? 0
      )
      const costoNuevo = Number(
        resultado.costo_nuevo ??
          (stockNuevo > 0
            ? ((stockAnterior * costoAnterior) + (cantidad * costoUnitario)) / stockNuevo
            : costoUnitario)
      )

      // Actualización inmediata de la interfaz. La fuente oficial ya es Supabase.
      if (onRegistrarEntrada) {
        onRegistrarEntrada({
          id: resultado.entrada_id || Date.now(),
          tipo: 'Entrada',
          fecha: formulario.fecha,
          productoId: Number(formulario.productoId),
          producto: productoSeleccionado.nombre,
          codigo: productoSeleccionado.codigo || '',
          cantidad,
          unidad: productoSeleccionado.unidad || '',
          costoTotal,
          costoUnitario,
          valorTotal: costoTotal,
          proveedor: formulario.proveedor.trim(),
          formaPago: formulario.formaPago,
          naturalezaFinanciera: 'Egreso',
          valorFinanciero: costoTotal,
          observacion: formulario.observacion.trim(),
          stockAnterior,
          stockNuevo,
          costoAnterior,
          costoNuevo,
          movimientoInventarioId: resultado.movimiento_inventario_id,
          movimientoFinancieroId: resultado.movimiento_financiero_id,
        })
      }

      alert('Entrada registrada correctamente en Supabase.')
      limpiarFormulario()
    } catch (error) {
      console.error('Error registrando entrada:', error)
      alert(`No fue posible registrar la entrada.\n\n${error.message || 'Error desconocido.'}`)
    } finally {
      setGuardando(false)
    }
  }

  const formatearNumero = (valor) =>
    Number(valor || 0).toLocaleString('es-CO', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })

  const formatearMoneda = (valor) =>
    Number(valor || 0).toLocaleString('es-CO', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })

  return (
    <div className="entradas-page">
      <header className="entradas-header">
        <div>
          <span className="entradas-eyebrow">MOVIMIENTOS · FITBAR</span>
          <h1>Entradas de inventario</h1>
          <p>Registra compras de materias primas y actualiza automáticamente el inventario.</p>
        </div>

        <div className="entradas-header-badge">
          <span className="entradas-badge-icon">↗</span>
          <div>
            <strong>{cantidadEntradas}</strong>
            <span>entradas registradas</span>
          </div>
        </div>
      </header>

      <section className="entradas-kpis">
        <article className="entrada-kpi">
          <span className="entrada-kpi-icon">＋</span>
          <div>
            <span>Total de entradas</span>
            <strong>{cantidadEntradas}</strong>
          </div>
        </article>

        <article className="entrada-kpi">
          <span className="entrada-kpi-icon">$</span>
          <div>
            <span>Compras registradas</span>
            <strong>${formatearMoneda(totalCompras)}</strong>
          </div>
        </article>

        <article className="entrada-kpi">
          <span className="entrada-kpi-icon">MP</span>
          <div>
            <span>Materias primas</span>
            <strong>{materiasPrimas.length}</strong>
          </div>
        </article>

        <article className="entrada-kpi">
          <span className="entrada-kpi-icon">◷</span>
          <div>
            <span>Última entrada</span>
            <strong>{ultimaEntrada?.fecha || '—'}</strong>
          </div>
        </article>
      </section>

      <div className="entradas-main-grid">
        <section className="entrada-card entrada-form-card">
          <div className="entrada-card-heading">
            <div>
              <span className="entrada-section-label">NUEVO MOVIMIENTO</span>
              <h2>Registrar compra</h2>
              <p>Completa los datos de la materia prima recibida.</p>
            </div>
            <span className="entrada-live-status">
              <i />
              Inventario
            </span>
          </div>

          <form onSubmit={registrarEntrada} className="entrada-form">
            <div className="entrada-form-section">
              <div className="entrada-form-section-title">
                <span>01</span>
                <div>
                  <strong>Información de la compra</strong>
                  <small>Identifica qué ingresó al inventario.</small>
                </div>
              </div>

              <div className="entrada-fields entrada-fields-top">
                <label className="entrada-field">
                  <span>Fecha</span>
                  <input
                    type="date"
                    value={formulario.fecha}
                    onChange={(event) => actualizarCampo('fecha', event.target.value)}
                  />
                </label>

                <label className="entrada-field entrada-field-wide">
                  <span>Materia prima <b>*</b></span>
                  <select
                    value={formulario.productoId}
                    onChange={(event) => actualizarCampo('productoId', event.target.value)}
                  >
                    <option value="">Selecciona una materia prima...</option>
                    {materiasPrimas.map((producto) => (
                      <option key={producto.id} value={producto.id}>
                        {producto.codigo ? `${producto.codigo} · ` : ''}{producto.nombre}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="entrada-selected-product">
                {productoSeleccionado ? (
                  <>
                    <div className="entrada-selected-avatar">MP</div>
                    <div className="entrada-selected-copy">
                      <strong>{productoSeleccionado.nombre}</strong>
                      <span>{productoSeleccionado.codigo || 'Sin código'} · Unidad de control: {productoSeleccionado.unidad}</span>
                    </div>
                    <div className="entrada-selected-stock">
                      <span>Stock actual</span>
                      <strong>{formatearNumero(productoSeleccionado.stock)} <small>{productoSeleccionado.unidad}</small></strong>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="entrada-selected-avatar muted">MP</div>
                    <div className="entrada-selected-copy muted-copy">
                      <strong>Selecciona una materia prima</strong>
                      <span>Su stock y unidad aparecerán aquí.</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="entrada-form-section">
              <div className="entrada-form-section-title">
                <span>02</span>
                <div>
                  <strong>Cantidad y costo</strong>
                  <small>El costo ingresado corresponde al valor total pagado.</small>
                </div>
              </div>

              <div className="entrada-fields entrada-fields-cost">
                <label className="entrada-field">
                  <span>Cantidad recibida <b>*</b></span>
                  <div className="entrada-input-suffix">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0"
                      value={formulario.cantidad}
                      onChange={(event) => actualizarCampo('cantidad', event.target.value)}
                    />
                    <em>{productoSeleccionado?.unidad || 'unidad'}</em>
                  </div>
                </label>

                <label className="entrada-field">
                  <span>Costo total de compra <b>*</b></span>
                  <div className="entrada-input-prefix">
                    <em>$</em>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0"
                      value={formulario.costoTotal}
                      onChange={(event) => actualizarCampo('costoTotal', event.target.value)}
                    />
                  </div>
                </label>

                <div className="entrada-calculated">
                  <span>Costo unitario</span>
                  <strong>
                    ${formatearMoneda(costoUnitario)}
                    <small>{productoSeleccionado ? ` / ${productoSeleccionado.unidad}` : ''}</small>
                  </strong>
                  <em>Calculado automáticamente</em>
                </div>
              </div>
            </div>

            <div className="entrada-form-section">
              <div className="entrada-form-section-title">
                <span>03</span>
                <div>
                  <strong>Pago y soporte</strong>
                  <small>Información complementaria del movimiento.</small>
                </div>
              </div>

              <div className="entrada-fields entrada-fields-bottom">
                <label className="entrada-field">
                  <span>Proveedor</span>
                  <input
                    type="text"
                    placeholder="Nombre del proveedor"
                    value={formulario.proveedor}
                    onChange={(event) => actualizarCampo('proveedor', event.target.value)}
                  />
                </label>

                <label className="entrada-field">
                  <span>Forma de pago</span>
                  <select
                    value={formulario.formaPago}
                    onChange={(event) => actualizarCampo('formaPago', event.target.value)}
                  >
                    <option value="Efectivo">Efectivo</option>
                    <option value="Transferencia">Transferencia</option>
                  </select>
                </label>

                <label className="entrada-field entrada-field-wide">
                  <span>Observación</span>
                  <input
                    type="text"
                    placeholder="Factura, referencia o comentario opcional"
                    value={formulario.observacion}
                    onChange={(event) => actualizarCampo('observacion', event.target.value)}
                  />
                </label>
              </div>
            </div>

            <div className="entrada-action-bar">
              <div>
                <span>Valor que se registrará</span>
                <strong>${formatearMoneda(costoTotal)}</strong>
              </div>
              <div className="entrada-actions">
                <button type="button" className="entrada-btn secondary" onClick={limpiarFormulario}>
                  Limpiar
                </button>
                <button type="submit" className="entrada-btn primary">
                  Registrar entrada <span>→</span>
                </button>
              </div>
            </div>
          </form>
        </section>

        <aside className="entrada-card entrada-preview-card">
          <div className="entrada-card-heading compact-heading">
            <div>
              <span className="entrada-section-label">VISTA PREVIA</span>
              <h2>Impacto en inventario</h2>
            </div>
          </div>

          {!productoSeleccionado ? (
            <div className="entrada-preview-empty">
              <div className="entrada-empty-icon">＋</div>
              <strong>Sin materia prima seleccionada</strong>
              <p>Selecciona una materia prima para visualizar cómo quedará el inventario después de registrar la compra.</p>
            </div>
          ) : (
            <>
              <div className="entrada-preview-product">
                <div className="entrada-preview-avatar">MP</div>
                <div>
                  <strong>{productoSeleccionado.nombre}</strong>
                  <span>{productoSeleccionado.codigo || 'Sin código'}</span>
                </div>
              </div>

              <div className="entrada-stock-comparison">
                <div>
                  <span>Stock actual</span>
                  <strong>{formatearNumero(productoSeleccionado.stock)}</strong>
                  <small>{productoSeleccionado.unidad}</small>
                </div>
                <div className="entrada-arrow">→</div>
                <div className="highlight">
                  <span>Stock nuevo</span>
                  <strong>{formatearNumero(productoSeleccionado.stock + cantidad)}</strong>
                  <small>{productoSeleccionado.unidad}</small>
                </div>
              </div>

              <div className="entrada-preview-list">
                <div>
                  <span>Cantidad ingresada</span>
                  <strong>+{formatearNumero(cantidad)} {productoSeleccionado.unidad}</strong>
                </div>
                <div>
                  <span>Costo unitario</span>
                  <strong>${formatearMoneda(costoUnitario)} / {productoSeleccionado.unidad}</strong>
                </div>
                <div>
                  <span>Total de compra</span>
                  <strong>${formatearMoneda(costoTotal)}</strong>
                </div>
                <div>
                  <span>Forma de pago</span>
                  <strong>{formulario.formaPago}</strong>
                </div>
              </div>

              <div className="entrada-preview-note">
                <span>i</span>
                <p>El sistema actualizará el stock y recalculará el costo promedio de la materia prima al registrar la entrada.</p>
              </div>
            </>
          )}
        </aside>
      </div>

      <section className="entrada-card entrada-history-card">
        <div className="entrada-card-heading">
          <div>
            <span className="entrada-section-label">HISTORIAL</span>
            <h2>Últimas entradas</h2>
            <p>Consulta las compras que han ingresado al inventario.</p>
          </div>
          <span className="entrada-history-count">{entradas.length} registros</span>
        </div>

        {entradas.length === 0 ? (
          <div className="entrada-history-empty">
            <span>＋</span>
            <strong>Aún no hay entradas registradas</strong>
            <p>Cuando registres una compra aparecerá aquí.</p>
          </div>
        ) : (
          <div className="entrada-table-wrap">
            <table className="entrada-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Materia prima</th>
                  <th>Cantidad</th>
                  <th>Costo unitario</th>
                  <th>Total compra</th>
                  <th>Forma de pago</th>
                  <th>Proveedor</th>
                </tr>
              </thead>
              <tbody>
                {entradas.slice().reverse().map((entrada) => (
                  <tr key={entrada.id}>
                    <td>{entrada.fecha}</td>
                    <td>
                      <div className="entrada-table-product">
                        <span>MP</span>
                        <div>
                          <strong>{entrada.producto}</strong>
                          <small>{entrada.codigo || 'Sin código'}</small>
                        </div>
                      </div>
                    </td>
                    <td>{formatearNumero(entrada.cantidad)} {entrada.unidad}</td>
                    <td>${formatearMoneda(entrada.costoUnitario)} / {entrada.unidad}</td>
                    <td><strong>${formatearMoneda(entrada.costoTotal ?? entrada.valorTotal)}</strong></td>
                    <td>
                      <span className={`entrada-payment ${entrada.formaPago === 'Transferencia' ? 'transfer' : ''}`}>
                        {entrada.formaPago || 'Efectivo'}
                      </span>
                    </td>
                    <td>{entrada.proveedor || '—'}</td>
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

export default Entradas

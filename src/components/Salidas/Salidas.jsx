import { useEffect } from 'react'

import { supabase } from '../../lib/supabaseClient'

import { useMemo, useState } from 'react'



function Salidas({

  productos = [],

  recetas = [],

  movimientos = [],

  onRegistrarSalida,

  onChange,

  puedeAdministrar = false,

}) {

  const [clientes,setClientes] = useState([])
  const [accion, setAccion] = useState(null)
  const [accionBusy, setAccionBusy] = useState(false)
  const [mensajeAccion, setMensajeAccion] = useState('')
  const [motivo, setMotivo] = useState('')
  const [nuevoPago, setNuevoPago] = useState('Efectivo')
  const [clienteAccion, setClienteAccion] = useState('')


  const [guardando,setGuardando] = useState(false)

  useEffect(()=>{supabase.from('fitbar_clientes').select('id,nombre').then(({data})=>setClientes(data||[]))},[])

  const productosFitbar = useMemo(

    () => productos.filter((producto) => producto.tipo === 'Producto Fitbar'),

    [productos]

  )



  const [formulario, setFormulario] = useState({

    fecha: new Date().toISOString().split('T')[0],

    productoId: '',

    cantidad: '',

    precioVenta: '',

    observacion: '',

    formaPago:'Efectivo',

    clienteId:'',

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

    if (!recetaSeleccionada) return []



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



  const salidas = movimientos

    .filter((movimiento) => movimiento.tipo === 'Salida')

    .slice()

    .reverse()



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

      observacion: '',

      formaPago:'Efectivo',

      clienteId:'',

    })

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



    const ejecutarAccion = async (event) => {
    event.preventDefault()
    if (!accion || accionBusy) return
    const venta = accion.venta
    if (!Number.isInteger(Number(venta.id)) || Number(venta.id) <= 0) {
      setMensajeAccion('No se pudo identificar el ID real de la venta. Recarga el historial antes de continuar.')
      return
    }
    if (accion.tipo === 'anular' && motivo.trim().length < 5) {
      setMensajeAccion('El motivo debe contener al menos 5 caracteres.')
      return
    }
    if (accion.tipo === 'pago' && nuevoPago === 'Crédito' && !clienteAccion) {
      setMensajeAccion('Selecciona el cliente para la venta a crédito.')
      return
    }
    setAccionBusy(true)
    setMensajeAccion('')
    try {
      const args = accion.tipo === 'anular'
        ? { p_salida_id: Number(venta.id), p_motivo: motivo.trim() }
        : { p_salida_id: Number(venta.id), p_forma_pago: nuevoPago, p_cliente_id: nuevoPago === 'Crédito' ? Number(clienteAccion) : null }
      const funcion = accion.tipo === 'anular' ? 'fitbar_anular_venta' : 'fitbar_cambiar_pago'
      const { error } = await supabase.rpc(funcion, args)
      if (error) throw error
      await onChange?.()
      setAccion(null)
      alert(accion.tipo === 'anular' ? 'Venta anulada correctamente.' : 'Forma de pago actualizada.')
    } catch (error) {
      setMensajeAccion(error.message || 'No se pudo completar la operación.')
    } finally {
      setAccionBusy(false)
    }
  }

const registrarSalida = async (event) => {

    if(guardando)return;

    event.preventDefault()



    if (!formulario.productoId) {

      alert('Selecciona el producto Fitbar.')

      return

    }



    if (cantidadVendida <= 0) {

      alert('Ingresa una cantidad vendida mayor que cero.')

      return

    }



    if (precioVenta < 0) {

      alert('El precio de venta no puede ser negativo.')

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



    if(formulario.formaPago==='Crédito'&&!formulario.clienteId){alert('Selecciona el cliente de la venta a crédito. Créalo en Cuentas por cobrar.');return}

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

      observacion: formulario.observacion.trim(),

      formaPago: formulario.formaPago,

      clienteId: formulario.clienteId ? Number(formulario.clienteId) : null,

    }



    setGuardando(true)

    let registrada = false

    try { registrada = await onRegistrarSalida?.(nuevaSalida) } finally {setGuardando(false)}

    if (registrada !== true) return



    alert(

      `Salida registrada correctamente.\n\n${cantidadVendida} ${productoSeleccionado?.nombre} descontado(s) del inventario según su receta.`

    )



    limpiarFormulario()

  }



  return (

    <>

      <div className="page-header">

        <div>

          <span className="eyebrow">MOVIMIENTOS · FITBAR</span>

          <h1>Salidas</h1>

          <p>

            Registra las ventas y descuenta automáticamente las materias primas

            según la receta del producto.

          </p>

        </div>

      </div>



      <div className="dashboard-two-columns">

        <section className="panel">

          <div className="panel-header">

            <div>

              <h2>Registrar salida</h2>

              <p>

                Selecciona el Fitbar, indica cuántas unidades se vendieron y el

                precio de venta por unidad.

              </p>

            </div>

          </div>



          <form onSubmit={registrarSalida}>

            <div className="form-grid">

              <label>

                Fecha

                <input

                  type="date"

                  value={formulario.fecha}

                  onChange={(event) =>

                    actualizarCampo('fecha', event.target.value)

                  }

                />

              </label>



              <label>

                Producto Fitbar

                <select

                  value={formulario.productoId}

                  onChange={(event) =>

                    actualizarCampo('productoId', event.target.value)

                  }

                >

                  <option value="">Selecciona un producto...</option>

                  {productosFitbar.map((producto) => (

                    <option key={producto.id} value={producto.id}>

                      {producto.nombre}

                    </option>

                  ))}

                </select>

              </label>



              <label>

                Cantidad vendida

                <div className="input-with-unit">

                  <input

                    type="number"

                    min="1"

                    step="1"

                    placeholder="0"

                    value={formulario.cantidad}

                    onChange={(event) =>

                      actualizarCampo('cantidad', event.target.value)

                    }

                  />

                  <span>und</span>

                </div>

              </label>



              <label>

                Precio de venta por unidad

                <div className="input-with-prefix">

                  <span>$</span>

                  <input

                    type="number"

                    min="0"

                    step="1"

                    placeholder="0"

                    value={formulario.precioVenta}

                    onChange={(event) =>

                      actualizarCampo('precioVenta', event.target.value)

                    }

                  />

                </div>

              </label>



              <label>

                Observación

                <input

                  type="text"

                  placeholder="Ej. venta mostrador"

                  value={formulario.observacion}

                  onChange={(event) =>

                    actualizarCampo('observacion', event.target.value)

                  }

                />

              </label>

            </div>



            <div className="form-grid"><label>Forma de pago<select value={formulario.formaPago} onChange={e=>actualizarCampo('formaPago',e.target.value)}><option>Efectivo</option><option>Transferencia</option><option value="Crédito">Deudor / Crédito</option></select></label>{formulario.formaPago==='Crédito'&&<label>Cliente<select required value={formulario.clienteId} onChange={e=>actualizarCampo('clienteId',e.target.value)}><option value="">Selecciona cliente</option>{clientes.map(c=><option key={c.id} value={c.id}>{c.nombre}</option>)}</select></label>}</div>

            <div className="recipe-summary">

              <div>

                <span>Valor total de la venta</span>

                <strong>{formatearMoneda(valorTotal)}</strong>

              </div>



              <div className="recipe-summary-info">

                <span>Receta</span>

                <strong>

                  {recetaSeleccionada

                    ? `${recetaSeleccionada.ingredientes.length} ingrediente(s)`

                    : 'Sin receta'}

                </strong>

              </div>

            </div>



            <div className="form-actions">

              <button className="secondary-button" type="button" onClick={limpiarFormulario}>

                Limpiar

              </button>

              <button className="primary-button" type="submit" disabled={guardando}>

                {guardando ? "Registrando..." : "Registrar salida"}

              </button>

            </div>

          </form>

        </section>



        <section className="panel">

          <div className="panel-header">

            <div>

              <h2>Consumo de ingredientes</h2>

              <p>

                Este es el inventario que se descontará al registrar la venta.

              </p>

            </div>

          </div>



          {!formulario.productoId ? (

            <div className="empty-state">

              <strong>Selecciona un producto</strong>

              <span>

                La receta y el consumo aparecerán automáticamente aquí.

              </span>

            </div>

          ) : !recetaSeleccionada ? (

            <div className="empty-state">

              <strong>Este producto no tiene receta</strong>

              <span>

                Configura primero la receta en el módulo Recetas para poder

                registrar su salida.

              </span>

            </div>

          ) : recetaSeleccionada.ingredientes.length === 0 ? (

            <div className="empty-state">

              <strong>La receta no tiene ingredientes</strong>

              <span>

                Regresa a Recetas y agrega las materias primas utilizadas por este producto.

              </span>

            </div>

          ) : (

            <div className="table-wrap">

              <table>

                <thead>

                  <tr>

                    <th>Ingrediente</th>

                    <th>Por unidad</th>

                    <th>Consumo</th>

                    <th>Stock</th>

                    <th>Estado</th>

                  </tr>

                </thead>

                <tbody>

                  {consumos.map((consumo) => (

                    <tr key={consumo.productoId}>

                      <td>

                        <strong>{consumo.nombre}</strong>

                        <small>{consumo.codigo}</small>

                      </td>

                      <td>

                        {formatearNumero(consumo.cantidadPorUnidad)}{' '}

                        {consumo.unidad}

                      </td>

                      <td>

                        {formatearNumero(consumo.cantidadNecesaria)}{' '}

                        {consumo.unidad}

                      </td>

                      <td>

                        {formatearNumero(consumo.stockActual)}{' '}

                        {consumo.unidad}

                      </td>

                      <td>

                        <span

                          className={`status-badge ${

                            consumo.suficiente ? 'ok' : 'danger'

                          }`}

                        >

                          {consumo.suficiente ? 'Disponible' : 'Insuficiente'}

                        </span>

                      </td>

                    </tr>

                  ))}

                </tbody>

              </table>

            </div>

          )}

        </section>

      </div>



                  {accion && (
        <section className="panel" style={{ padding: 20, marginBottom: 18, border: '2px solid #a1e681' }}>
          <h2>{accion.tipo === 'anular' ? 'Anular venta' : 'Cambiar forma de pago'} #{accion.venta.id}</h2>
          <p>Producto: {accion.venta.producto} · Total: {formatearMoneda(accion.venta.valorTotal)}</p>
          <form onSubmit={ejecutarAccion}>
            {accion.tipo === 'anular' ? (
              <label>Motivo de anulación (obligatorio)
                <input required minLength={5} value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Explica por qué se anula la venta" />
              </label>
            ) : (
              <div className="form-grid">
                <label>Nuevo método de pago
                  <select value={nuevoPago} onChange={e => setNuevoPago(e.target.value)}>
                    <option value="Efectivo">Efectivo</option>
                    <option value="Transferencia">Transferencia</option>
                    <option value="Crédito">Crédito</option>
                  </select>
                </label>
                {nuevoPago === 'Crédito' && (
                  <label>Cliente
                    <select required value={clienteAccion} onChange={e => setClienteAccion(e.target.value)}>
                      <option value="">Selecciona un cliente</option>
                      {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select>
                  </label>
                )}
              </div>
            )}
            {accion.tipo === 'anular' && <p>Esta acción devolverá los ingredientes al inventario y registrará la reversión financiera.</p>}
            {mensajeAccion && <p role="alert" style={{ color: '#b42318' }}>{mensajeAccion}</p>}
            <div className="form-actions">
              <button type="button" className="secondary-button" disabled={accionBusy} onClick={() => setAccion(null)}>Cancelar</button>
              <button type="submit" className="primary-button" disabled={accionBusy}>
                {accionBusy ? 'Procesando...' : accion.tipo === 'anular' ? 'Confirmar anulación' : 'Guardar cambio'}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="panel">

        <div className="panel-header">

          <div>

<h2>Últimas salidas</h2>

            <p>Historial de ventas registradas en esta sesión.</p>

          </div>

          <span className="panel-count">{salidas.length}</span>

        </div>



        {salidas.length === 0 ? (

          <div className="empty-state">

            <strong>Aún no hay salidas registradas</strong>

            <span>

              Cuando registres una venta aparecerá aquí junto con su valor total.

            </span>

          </div>

        ) : (

          <div className="table-wrap">

            <table>

              <thead>

                <tr>

                  <th>Fecha</th>

                  <th>Producto</th>

                  <th>Cantidad</th>

                  <th>Precio unitario</th>

                  <th>Total</th>

                  <th>Observación</th><th>Estado / Pago</th>

                </tr>

              </thead>

              <tbody>

                {salidas.map((salida) => (

                  <tr key={salida.id}>

                    <td>{salida.fecha}</td>

                    <td>

                      <strong>{salida.producto}</strong>

                      <small>{salida.codigo}</small>

                    </td>

                    <td>

                      {formatearNumero(salida.cantidad)} {salida.unidad}

                    </td>

                    <td>{formatearMoneda(salida.precioVenta)}</td>

                    <td>

                      <strong>{formatearMoneda(salida.valorTotal)}</strong>

                    </td>

                    <td>{salida.observacion || '—'}</td>
                    <td>
                      {salida.anulada ? 'ANULADA' : salida.formaPago}
                      {puedeAdministrar && !salida.anulada && (
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                          <button type="button" className="secondary-button" disabled={accionBusy} onClick={() => { setAccion({ tipo: 'pago', venta: salida }); setMensajeAccion(''); setNuevoPago(salida.formaPago || 'Efectivo'); setClienteAccion(String(salida.clienteId || '')) }}>
                            Cambiar pago
                          </button>
                          <button type="button" className="secondary-button" disabled={accionBusy} onClick={() => { setAccion({ tipo: 'anular', venta: salida }); setMensajeAccion(''); setMotivo('') }}>
                            Anular
                          </button>
                        </div>
                      )}
                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        )}

      </section>

    </>

  )

}



export default Salidas

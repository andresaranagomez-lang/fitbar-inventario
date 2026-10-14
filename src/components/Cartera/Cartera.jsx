import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

const money = n => Number(n || 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })

export default function Cartera({ onChange }) {
  const [ventas, setVentas] = useState([])
  const [clientes, setClientes] = useState([])
  const [abonos, setAbonos] = useState([])
  const [nuevo, setNuevo] = useState('')
  const [telefono, setTelefono] = useState('')
  const [busy, setBusy] = useState(false)
  const [seleccion, setSeleccion] = useState(null)
  const [valorAbono, setValorAbono] = useState('')
  const [formaAbono, setFormaAbono] = useState('Efectivo')
  const [errorFormulario, setErrorFormulario] = useState('')

  const load = async () => {
    const [v, c, a] = await Promise.all([
      supabase.from('salidas').select('id,fecha,valor_total,cliente_id,forma_pago,anulada').eq('forma_pago', 'Crédito'),
      supabase.from('fitbar_clientes').select('*'),
      supabase.from('fitbar_abonos').select('*')
    ])
    for (const r of [v, c, a]) {
      if (r.error) throw r.error
    }
    setVentas(v.data || [])
    setClientes(c.data || [])
    setAbonos(a.data || [])
  }

  useEffect(() => {
    load().catch(e => setErrorFormulario(e.message || 'Error al cargar cartera'))
  }, [])

  const crear = async e => {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setErrorFormulario('')
    try {
      const { error } = await supabase.rpc('fitbar_crear_cliente', { p_nombre: nuevo.trim(), p_telefono: telefono.trim() })
      if (error) throw error
      setNuevo('')
      setTelefono('')
      await load()
      await onChange?.()
    } catch (e) {
      setErrorFormulario(e.message || 'No se pudo guardar el cliente')
    } finally {
      setBusy(false)
    }
  }

  const saldoVenta = v => Number(v.valor_total) - abonos.filter(a => Number(a.salida_id) === Number(v.id)).reduce((t, a) => t + Number(a.valor), 0)
  const pendientes = ventas.filter(v => !v.anulada).map(v => ({ ...v, saldo: saldoVenta(v) }))

  const cobrar = async e => {
    e.preventDefault()
    if (!seleccion || busy) return
    const importe = Number(valorAbono)
    const saldoActual = saldoVenta(seleccion)
    if (!Number.isFinite(importe) || importe <= 0 || importe > saldoActual) {
      setErrorFormulario(`Ingresa un abono mayor que cero y no superior a ${money(saldoActual)}.`)
      return
    }
    setBusy(true)
    setErrorFormulario('')
    try {
      const { error } = await supabase.rpc('fitbar_registrar_abono', {
        p_salida_id: seleccion.id,
        p_valor: importe,
        p_forma_pago: formaAbono
      })
      if (error) throw error
      await load()
      await onChange?.()
      setSeleccion(null)
      setValorAbono('')
      alert('Abono registrado correctamente.')
    } catch (e) {
      setErrorFormulario(e.message || 'No se pudo registrar el abono')
    } finally {
      setBusy(false)
    }
  }

  return <>
    <div className="page-header"><div><span className="eyebrow">CONTROL · CARTERA</span><h1>Cuentas por cobrar</h1><p>Clientes, ventas a crédito y abonos recibidos.</p></div></div>
    <div className="stats-grid">
      <div className="stat-card"><span className="stat-label">Cartera pendiente</span><strong>{money(pendientes.reduce((t, v) => t + Math.max(0, v.saldo), 0))}</strong></div>
      <div className="stat-card"><span className="stat-label">Clientes</span><strong>{clientes.length}</strong></div>
    </div>
    <section className="panel" style={{ padding: 20 }}>
      <h2>Nuevo cliente</h2>
      <form onSubmit={crear}>
        <div className="form-grid">
          <label>Nombre<input required minLength={2} value={nuevo} onChange={e => setNuevo(e.target.value)} /></label>
          <label>Teléfono<input value={telefono} onChange={e => setTelefono(e.target.value)} /></label>
        </div>
        <button type="submit" disabled={busy} className="primary-button">Guardar cliente</button>
      </form>
    </section>
    <section className="panel">
      <div className="panel-header"><h2>Ventas a crédito</h2></div>
      <div className="table-wrapper"><table>
        <thead><tr><th>Venta</th><th>Fecha</th><th>Cliente</th><th>Total</th><th>Saldo</th><th>Acción</th></tr></thead>
        <tbody>{pendientes.map(v => <tr key={v.id}>
          <td>#{v.id}</td><td>{v.fecha}</td><td>{clientes.find(c => Number(c.id) === Number(v.cliente_id))?.nombre || 'Sin cliente'}</td>
          <td>{money(v.valor_total)}</td><td>{money(v.saldo)}</td>
          <td>{v.saldo > 0 && <button type="button" className="secondary-button" disabled={busy} onClick={() => { setSeleccion(v); setValorAbono(''); setFormaAbono('Efectivo'); setErrorFormulario('') }}>Registrar abono</button>}</td>
        </tr>)}</tbody>
      </table></div>
    </section>
    {seleccion && <section className="panel" style={{ padding: 20, marginTop: 16, border: '2px solid #a1e681' }}>
      <h2>Registrar abono — Venta #{seleccion.id}</h2>
      <p>Cliente: {clientes.find(c => Number(c.id) === Number(seleccion.cliente_id))?.nombre || 'Sin cliente'} · Saldo disponible: <strong>{money(saldoVenta(seleccion))}</strong></p>
      <form onSubmit={cobrar}>
        <div className="form-grid">
          <label>Valor del abono
            <input type="number" required min="0.01" step="0.01" max={Math.max(0, saldoVenta(seleccion))} value={valorAbono} onChange={e => setValorAbono(e.target.value)} placeholder="Valor en pesos" />
          </label>
          <label>Forma de pago
            <select value={formaAbono} onChange={e => setFormaAbono(e.target.value)}><option value="Efectivo">Efectivo</option><option value="Transferencia">Transferencia</option></select>
          </label>
        </div>
        {errorFormulario && <p role="alert" style={{ color: '#b42318' }}>{errorFormulario}</p>}
        <div className="form-actions">
          <button type="button" className="secondary-button" disabled={busy} onClick={() => { setSeleccion(null); setErrorFormulario('') }}>Cancelar</button>
          <button type="submit" className="primary-button" disabled={busy}>{busy ? 'Registrando...' : 'Confirmar abono'}</button>
        </div>
      </form>
    </section>}
    {!seleccion && errorFormulario && <p role="alert" style={{ color: '#b42318' }}>{errorFormulario}</p>}
  </>
}

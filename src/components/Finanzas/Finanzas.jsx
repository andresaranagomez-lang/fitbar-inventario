import { useMemo, useState } from 'react'

function Finanzas({ movimientos = [] }) {
  const [vista, setVista] = useState('resumen')
  const [periodo, setPeriodo] = useState('todo')
  const [busqueda, setBusqueda] = useState('')

  const formatearMoneda = (valor) =>
    Number(valor || 0).toLocaleString('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    })

  const formatearNumero = (valor) =>
    Number(valor || 0).toLocaleString('es-CO', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })

  const movimientosFinancieros = useMemo(() => {
    return movimientos
      .filter(
        (movimiento) =>
          movimiento.tipo === 'Entrada' || movimiento.tipo === 'Salida'
      )
      .map((movimiento) => {
        const esEntrada = movimiento.tipo === 'Entrada'

        const valor = esEntrada
          ? Number(movimiento.costoTotal ?? movimiento.valorTotal ?? 0)
          : Number(movimiento.valorTotal ?? 0)

        const formaPago = movimiento.formaPago || 'Efectivo'

        return {
          ...movimiento,
          valor,
          formaPago,
          naturaleza: esEntrada
            ? 'Gasto / Compra'
            : 'Ingreso / Venta',
          movimientoFinanciero: esEntrada ? 'Egreso' : 'Ingreso',
        }
      })
  }, [movimientos])

  const movimientosFiltrados = useMemo(() => {
    const hoy = new Date()

    return movimientosFinancieros.filter((movimiento) => {
      if (busqueda.trim()) {
        const texto = [
          movimiento.producto,
          movimiento.codigo,
          movimiento.proveedor,
          movimiento.observacion,
          movimiento.formaPago,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()

        if (!texto.includes(busqueda.toLowerCase())) {
          return false
        }
      }

      if (periodo === 'todo') {
        return true
      }

      const fechaMovimiento = new Date(`${movimiento.fecha}T00:00:00`)

      if (Number.isNaN(fechaMovimiento.getTime())) {
        return true
      }

      if (periodo === 'hoy') {
        return fechaMovimiento.toDateString() === hoy.toDateString()
      }

      if (periodo === 'mes') {
        return (
          fechaMovimiento.getMonth() === hoy.getMonth() &&
          fechaMovimiento.getFullYear() === hoy.getFullYear()
        )
      }

      if (periodo === 'anio') {
        return fechaMovimiento.getFullYear() === hoy.getFullYear()
      }

      return true
    })
  }, [movimientosFinancieros, periodo, busqueda])

  const indicadores = useMemo(() => {
    let ingresos = 0
    let egresos = 0

    let ingresosEfectivo = 0
    let ingresosTransferencia = 0

    let egresosEfectivo = 0
    let egresosTransferencia = 0

    movimientosFiltrados.forEach((movimiento) => {
      if (movimiento.movimientoFinanciero === 'Ingreso') {
        ingresos += movimiento.valor

        if (movimiento.formaPago === 'Transferencia') {
          ingresosTransferencia += movimiento.valor
        } else {
          ingresosEfectivo += movimiento.valor
        }
      }

      if (movimiento.movimientoFinanciero === 'Egreso') {
        egresos += movimiento.valor

        if (movimiento.formaPago === 'Transferencia') {
          egresosTransferencia += movimiento.valor
        } else {
          egresosEfectivo += movimiento.valor
        }
      }
    })

    return {
      ingresos,
      egresos,
      flujoNeto: ingresos - egresos,
      ingresosEfectivo,
      ingresosTransferencia,
      egresosEfectivo,
      egresosTransferencia,
      saldoEfectivo: ingresosEfectivo - egresosEfectivo,
      saldoBanco: ingresosTransferencia - egresosTransferencia,
    }
  }, [movimientosFiltrados])

  const movimientosConciliacion = useMemo(() => {
    return movimientosFiltrados.map((movimiento) => ({
      ...movimiento,
      conciliado: Boolean(movimiento.conciliado),
    }))
  }, [movimientosFiltrados])

  const limpiarFiltros = () => {
    setBusqueda('')
    setPeriodo('todo')
  }

  const getClaseFlujo = (valor) => {
    if (valor > 0) return 'financial-positive'
    if (valor < 0) return 'financial-negative'
    return ''
  }

  return (
    <>
      <div className="page-header">
        <div>
          <span className="eyebrow">CONTROL · FINANCIERO</span>

          <h1>Finanzas</h1>

          <p>
            Controla el flujo de efectivo, bancos y movimientos financieros
            generados por el Fitbar.
          </p>
        </div>
      </div>

      <div className="finance-tabs">
        <button
          type="button"
          className={vista === 'resumen' ? 'active' : ''}
          onClick={() => setVista('resumen')}
        >
          Resumen financiero
        </button>

        <button
          type="button"
          className={vista === 'flujo' ? 'active' : ''}
          onClick={() => setVista('flujo')}
        >
          Flujo de efectivo
        </button>

        <button
          type="button"
          className={vista === 'bancos' ? 'active' : ''}
          onClick={() => setVista('bancos')}
        >
          Bancos
        </button>

        <button
          type="button"
          className={vista === 'conciliacion' ? 'active' : ''}
          onClick={() => setVista('conciliacion')}
        >
          Conciliación
        </button>
      </div>

      <section className="finance-kpis">
        <div className="finance-card">
          <span>Ingresos</span>

          <strong>{formatearMoneda(indicadores.ingresos)}</strong>

          <small>Ventas registradas</small>
        </div>

        <div className="finance-card">
          <span>Egresos</span>

          <strong>{formatearMoneda(indicadores.egresos)}</strong>

          <small>Compras y gastos</small>
        </div>

        <div className="finance-card">
          <span>Flujo neto</span>

          <strong className={getClaseFlujo(indicadores.flujoNeto)}>
            {formatearMoneda(indicadores.flujoNeto)}
          </strong>

          <small>Ingresos menos egresos</small>
        </div>

        <div className="finance-card">
          <span>Saldo efectivo</span>

          <strong>{formatearMoneda(indicadores.saldoEfectivo)}</strong>

          <small>Disponible en caja</small>
        </div>

        <div className="finance-card">
          <span>Saldo banco</span>

          <strong>{formatearMoneda(indicadores.saldoBanco)}</strong>

          <small>Transferencias netas</small>
        </div>
      </section>

      <section className="panel finance-filters">
        <div className="panel-header">
          <div>
            <h2>Filtros financieros</h2>

            <p>
              Consulta los movimientos generados automáticamente por el
              sistema.
            </p>
          </div>

          <button
            className="secondary-button"
            type="button"
            onClick={limpiarFiltros}
          >
            Limpiar filtros
          </button>
        </div>

        <div className="finance-filter-grid">
          <input
            type="text"
            placeholder="Buscar producto, proveedor o referencia..."
            value={busqueda}
            onChange={(event) => setBusqueda(event.target.value)}
          />

          <select
            value={periodo}
            onChange={(event) => setPeriodo(event.target.value)}
          >
            <option value="todo">Todo el período</option>
            <option value="hoy">Hoy</option>
            <option value="mes">Mes actual</option>
            <option value="anio">Año actual</option>
          </select>
        </div>
      </section>

      {vista === 'resumen' && (
        <>
          <div className="finance-two-columns">
            <section className="panel">
              <div className="panel-header">
                <div>
                  <h2>Distribución del dinero</h2>

                  <p>
                    Comportamiento financiero según el medio de pago.
                  </p>
                </div>
              </div>

              <div className="finance-summary-list">
                <div className="finance-summary-row">
                  <div>
                    <span>Ventas en efectivo</span>
                    <small>Ingresos recibidos en caja</small>
                  </div>

                  <strong>
                    {formatearMoneda(indicadores.ingresosEfectivo)}
                  </strong>
                </div>

                <div className="finance-summary-row">
                  <div>
                    <span>Ventas por transferencia</span>
                    <small>Ingresos recibidos en banco</small>
                  </div>

                  <strong>
                    {formatearMoneda(indicadores.ingresosTransferencia)}
                  </strong>
                </div>

                <div className="finance-summary-row">
                  <div>
                    <span>Compras en efectivo</span>
                    <small>Gastos pagados desde caja</small>
                  </div>

                  <strong>
                    {formatearMoneda(indicadores.egresosEfectivo)}
                  </strong>
                </div>

                <div className="finance-summary-row">
                  <div>
                    <span>Compras por transferencia</span>
                    <small>Gastos pagados desde banco</small>
                  </div>

                  <strong>
                    {formatearMoneda(indicadores.egresosTransferencia)}
                  </strong>
                </div>
              </div>
            </section>

            <section className="panel">
              <div className="panel-header">
                <div>
                  <h2>Posición financiera</h2>

                  <p>
                    Saldo generado por los movimientos registrados.
                  </p>
                </div>
              </div>

              <div className="financial-position">
                <div>
                  <span>💵 Caja</span>

                  <strong>
                    {formatearMoneda(indicadores.saldoEfectivo)}
                  </strong>
                </div>

                <div>
                  <span>🏦 Bancos</span>

                  <strong>
                    {formatearMoneda(indicadores.saldoBanco)}
                  </strong>
                </div>

                <div className="financial-total">
                  <span>Disponible total</span>

                  <strong>
                    {formatearMoneda(
                      indicadores.saldoEfectivo +
                        indicadores.saldoBanco
                    )}
                  </strong>
                </div>
              </div>
            </section>
          </div>

          <section className="panel">
            <div className="panel-header">
              <div>
                <h2>Últimos movimientos financieros</h2>

                <p>
                  Las compras y ventas alimentan este registro
                  automáticamente.
                </p>
              </div>

              <span className="count-badge">
                {movimientosFiltrados.length}
              </span>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Tipo</th>
                    <th>Concepto</th>
                    <th>Medio</th>
                    <th>Ingreso</th>
                    <th>Egreso</th>
                    <th>Referencia</th>
                  </tr>
                </thead>

                <tbody>
                  {movimientosFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan="7">
                        <div className="empty-state">
                          <strong>
                            No hay movimientos financieros
                          </strong>

                          <span>
                            Cuando registres compras o ventas aparecerán
                            automáticamente aquí.
                          </span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    movimientosFiltrados
                      .slice()
                      .reverse()
                      .map((movimiento) => (
                        <tr key={movimiento.id}>
                          <td>{movimiento.fecha}</td>

                          <td>
                            <span
                              className={`status-badge ${
                                movimiento.movimientoFinanciero ===
                                'Ingreso'
                                  ? 'ok'
                                  : 'danger'
                              }`}
                            >
                              {movimiento.movimientoFinanciero}
                            </span>
                          </td>

                          <td>
                            <strong>
                              {movimiento.producto ||
                                movimiento.proveedor ||
                                'Movimiento'}
                            </strong>

                            <small>
                              {movimiento.naturaleza}
                            </small>
                          </td>

                          <td>{movimiento.formaPago}</td>

                          <td>
                            {movimiento.movimientoFinanciero ===
                            'Ingreso'
                              ? formatearMoneda(movimiento.valor)
                              : '—'}
                          </td>

                          <td>
                            {movimiento.movimientoFinanciero ===
                            'Egreso'
                              ? formatearMoneda(movimiento.valor)
                              : '—'}
                          </td>

                          <td>
                            {movimiento.codigo ||
                              movimiento.observacion ||
                              '—'}
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {vista === 'flujo' && (
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Flujo de efectivo</h2>

              <p>
                Muestra cómo entra y sale el dinero del Fitbar.
              </p>
            </div>
          </div>

          <div className="cash-flow-grid">
            <div className="cash-flow-block positive">
              <span>Ingresos</span>

              <strong>
                {formatearMoneda(indicadores.ingresos)}
              </strong>

              <small>Ventas y otros ingresos</small>
            </div>

            <div className="cash-flow-arrow">−</div>

            <div className="cash-flow-block negative">
              <span>Egresos</span>

              <strong>
                {formatearMoneda(indicadores.egresos)}
              </strong>

              <small>Compras y gastos</small>
            </div>

            <div className="cash-flow-arrow">=</div>

            <div className="cash-flow-block">
              <span>Flujo neto</span>

              <strong
                className={getClaseFlujo(indicadores.flujoNeto)}
              >
                {formatearMoneda(indicadores.flujoNeto)}
              </strong>

              <small>Resultado del período</small>
            </div>
          </div>

          <div className="finance-breakdown">
            <div>
              <span>Ingresos en efectivo</span>
              <strong>
                {formatearMoneda(indicadores.ingresosEfectivo)}
              </strong>
            </div>

            <div>
              <span>Ingresos por transferencia</span>
              <strong>
                {formatearMoneda(
                  indicadores.ingresosTransferencia
                )}
              </strong>
            </div>

            <div>
              <span>Egresos en efectivo</span>
              <strong>
                {formatearMoneda(indicadores.egresosEfectivo)}
              </strong>
            </div>

            <div>
              <span>Egresos por transferencia</span>
              <strong>
                {formatearMoneda(
                  indicadores.egresosTransferencia
                )}
              </strong>
            </div>
          </div>
        </section>
      )}

      {vista === 'bancos' && (
        <>
          <section className="finance-two-columns">
            <section className="panel">
              <div className="panel-header">
                <div>
                  <h2>Cuenta bancaria</h2>

                  <p>
                    Control de movimientos realizados mediante
                    transferencia.
                  </p>
                </div>
              </div>

              <div className="bank-balance">
                <span>Saldo según el sistema</span>

                <strong>
                  {formatearMoneda(indicadores.saldoBanco)}
                </strong>
              </div>
            </section>

            <section className="panel">
              <div className="panel-header">
                <div>
                  <h2>Movimientos bancarios</h2>

                  <p>
                    Ingresos y egresos asociados a transferencias.
                  </p>
                </div>
              </div>

              <div className="bank-stats">
                <div>
                  <span>Entradas</span>
                  <strong>
                    {formatearMoneda(
                      indicadores.ingresosTransferencia
                    )}
                  </strong>
                </div>

                <div>
                  <span>Salidas</span>
                  <strong>
                    {formatearMoneda(
                      indicadores.egresosTransferencia
                    )}
                  </strong>
                </div>
              </div>
            </section>
          </section>

          <section className="panel">
            <div className="panel-header">
              <div>
                <h2>Movimientos del banco</h2>

                <p>
                  Solo se muestran operaciones realizadas por
                  transferencia.
                </p>
              </div>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Tipo</th>
                    <th>Concepto</th>
                    <th>Entrada</th>
                    <th>Salida</th>
                    <th>Estado</th>
                  </tr>
                </thead>

                <tbody>
                  {movimientosFiltrados.filter(
                    (movimiento) =>
                      movimiento.formaPago === 'Transferencia'
                  ).length === 0 ? (
                    <tr>
                      <td colSpan="6">
                        <div className="empty-state">
                          <strong>
                            No hay movimientos bancarios
                          </strong>

                          <span>
                            Las transferencias registradas aparecerán
                            aquí.
                          </span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    movimientosFiltrados
                      .filter(
                        (movimiento) =>
                          movimiento.formaPago ===
                          'Transferencia'
                      )
                      .slice()
                      .reverse()
                      .map((movimiento) => (
                        <tr key={movimiento.id}>
                          <td>{movimiento.fecha}</td>

                          <td>
                            <span
                              className={`status-badge ${
                                movimiento.movimientoFinanciero ===
                                'Ingreso'
                                  ? 'ok'
                                  : 'danger'
                              }`}
                            >
                              {movimiento.movimientoFinanciero}
                            </span>
                          </td>

                          <td>
                            <strong>
                              {movimiento.producto ||
                                movimiento.proveedor ||
                                'Movimiento'}
                            </strong>
                          </td>

                          <td>
                            {movimiento.movimientoFinanciero ===
                            'Ingreso'
                              ? formatearMoneda(movimiento.valor)
                              : '—'}
                          </td>

                          <td>
                            {movimiento.movimientoFinanciero ===
                            'Egreso'
                              ? formatearMoneda(movimiento.valor)
                              : '—'}
                          </td>

                          <td>
                            <span className="status-badge ok">
                              Registrado
                            </span>
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {vista === 'conciliacion' && (
        <>
          <section className="finance-two-columns">
            <section className="panel">
              <div className="panel-header">
                <div>
                  <h2>Conciliación bancaria</h2>

                  <p>
                    Compara los movimientos del sistema con el
                    extracto bancario.
                  </p>
                </div>
              </div>

              <div className="reconciliation-info">
                <div>
                  <span>Movimientos registrados</span>

                  <strong>
                    {movimientosConciliacion.length}
                  </strong>
                </div>

                <div>
                  <span>Conciliados</span>

                  <strong>0</strong>
                </div>

                <div>
                  <span>Pendientes</span>

                  <strong>
                    {movimientosConciliacion.length}
                  </strong>
                </div>
              </div>
            </section>

            <section className="panel">
              <div className="panel-header">
                <div>
                  <h2>Saldo bancario</h2>

                  <p>
                    Valor calculado con las transferencias registradas.
                  </p>
                </div>
              </div>

              <div className="bank-balance">
                <span>Saldo según sistema</span>

                <strong>
                  {formatearMoneda(indicadores.saldoBanco)}
                </strong>
              </div>
            </section>
          </section>

          <section className="panel">
            <div className="panel-header">
              <div>
                <h2>Movimientos pendientes de conciliación</h2>

                <p>
                  Esta será la base para comparar posteriormente contra
                  el extracto bancario.
                </p>
              </div>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Tipo</th>
                    <th>Concepto</th>
                    <th>Forma de pago</th>
                    <th>Valor</th>
                    <th>Estado</th>
                  </tr>
                </thead>

                <tbody>
                  {movimientosConciliacion.length === 0 ? (
                    <tr>
                      <td colSpan="6">
                        <div className="empty-state">
                          <strong>
                            No existen movimientos para conciliar
                          </strong>

                          <span>
                            Los movimientos bancarios aparecerán
                            automáticamente.
                          </span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    movimientosConciliacion
                      .slice()
                      .reverse()
                      .map((movimiento) => (
                        <tr key={movimiento.id}>
                          <td>{movimiento.fecha}</td>

                          <td>
                            {movimiento.movimientoFinanciero}
                          </td>

                          <td>
                            <strong>
                              {movimiento.producto ||
                                movimiento.proveedor ||
                                'Movimiento'}
                            </strong>
                          </td>

                          <td>{movimiento.formaPago}</td>

                          <td>
                            {formatearMoneda(movimiento.valor)}
                          </td>

                          <td>
                            <span className="status-badge warning">
                              Pendiente
                            </span>
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </>
  )
}

export default Finanzas
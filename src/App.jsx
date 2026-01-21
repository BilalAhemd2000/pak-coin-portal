import { useEffect, useMemo, useState } from 'react'
import './App.css'
import axios from 'axios'
import toast from 'react-hot-toast'
import WalletAddress from './WalletAddress'

const tabs = [
  { key: 'login', label: 'Login' },
  { key: 'signup', label: 'Sign Up' },
]

export const base_url = "http://192.168.100.83:3050/api/v1";

const summaryCards = (data) => {
  console.log({ data })
  if (!data) return []
  return [
    {
      label: 'Total Balance',
      // value: '$45,231.89',
      value: data?.totalBalance,
      hint: '+20.1% from last month',
      statusColor: '#10b981',
    },
    ...data?.balances?.map(item => {
      return {
        label: `${item.tokenName} Available`,
        value: item.balance,
        hint: item?.tokenName === "USDB" ? "Ready for withdrawal" : "Using Circle Network",
        statusColor: '#3b82f6',
      }
    })
    // {
    //   label: 'USDC Available',
    //   value: '12,500.00',
    //   hint: 'Using Circle Network',
    //   statusColor: '#3b82f6',
    // },
    // {
    //   label: 'USDB (Block Verce)',
    //   value: '32,731.89',
    //   hint: 'Ready for withdrawal',
    //   statusColor: '#22c55e',
    // },
    // , {
    //   label: 'Past Withdrawals',
    //   value: '3',
    //   hint: 'Processing to banks',
    //   statusColor: '#f59e0b',
    // },
  ]
}

const navLinks = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'withdraw', label: 'Withdraw' },
  { key: 'settings', label: 'Settings' },
]

const bankOptions = (data) => {
  if (!data) return []
  return data.map((item, indx) => {
    return {
      code: item?.tokenName, name: item?.names, initial: item?.tokenName[0], color: indx % 2 == 0 ? '#0f766e' : '#1d4ed8'
    }
  })
  // [
  // { code: 'HBLX', name: 'HBL Exchange Bank', initial: 'H', color: '#0f766e' },
  // { code: 'BOPX', name: 'Bank of Punjab X', initial: 'B', color: '#1d4ed8' },
  // { code: 'MEZX', name: 'Meezan Exchange', initial: 'M', color: '#7c3aed' },
  // ]
}

const formatMoney = (value, currency = '') => {
  const num = Number(value)
  if (!Number.isFinite(num)) return `0 ${currency}`
  return `${num.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency}`
}

const App = () => {
  const [activeTab, setActiveTab] = useState('login')
  let _user = localStorage.getItem("user") ? JSON.parse(localStorage.getItem("user")) : null;
  const [isAuthenticated, setIsAuthenticated] = useState(_user);
  const [user, setUser] = useState(_user);
  const [dashboardData, setDashboardData] = useState(null);
  const [tokenListings, setTokenListings] = useState([]);
  const [activeSection, setActiveSection] = useState('dashboard')
  const [converterName, setConverterName] = useState('');
  const [convertAmount, setConvertAmount] = useState('');
  const [convertFrom, setConvertFrom] = useState();
  const [convertTo, setConvertTo] = useState();
  const [selectedBank, setSelectedBank] = useState('')
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [descaddress, setdescaddress] = useState('')
  const [loginSignLoader, setLoginSignLoader] = useState(false)
  const [convertLoader, setConvertLoader] = useState(false);
  const [withdrawLoader, setWithdrawLoader] = useState(false);
  const [history, setHistory] = useState([
    { id: 1, type: 'withdraw', text: 'Withdrawn 150,000 USDB to HBLX' },
    { id: 2, type: 'convert', text: 'Converted 80 USDC to 80 USDB' },
    { id: 3, type: 'withdraw', text: 'Withdrawn 100,000 USDB to MEZX' },
    { idL: 4, type: "convert", text: "Converted 12 USDC to 12 USDB" }
  ])
  const [formValues, setFormValues] = useState({
    name: '',
    email: '',
    age: '',
    address: '',
    password: '',
    remember: false,
  })

  const greeting = useMemo(() => {
    if (!user?.name) return 'Welcome back'
    const firstName = user?.name?.split(' ')[0]
    const walletAddress = user?.walletAddress;
    return {
      name: `Hey, ${firstName}`,
      walletAddress,
    }
    return `Hey, ${firstName} ${walletAddress ? `(${walletAddress.slice(0, 20)}...)` : ""}`
  }, [user])

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target
    setFormValues((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    // console.log(formValues)
    try {
      setLoginSignLoader(true)
      const singupRes = activeTab === 'signup' ?
        await axios.post(`${base_url}/auth/signup`, formValues) :
        await axios.post(`${base_url}/auth/login`, formValues);
      console.log({ singupRes })
      toast.success(singupRes.data.message)
      setLoginSignLoader(false)
      const userInfo = singupRes.data.data;
      localStorage.setItem("user", JSON.stringify(userInfo))
      setUser(userInfo)
      setIsAuthenticated(true)
    }
    catch (err) {
      console.log(err)
      toast.error(err.response.data.message)
    } finally {
      setLoginSignLoader(false)
    }
  }
  const handleLogout = () => {
    setIsAuthenticated(false)
    setUser(null)
    setDashboardData(null)
    localStorage.clear()
    setFormValues({
      name: '',
      email: '',
      password: '',
      age: '',
      address: '',
      remember: false,
    })
    setActiveTab('login')
    setActiveSection('dashboard')
  }

  function formatNumber(value) {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(value);
  }

  const handleConvert = async (e) => {
    e.preventDefault()
    const amount = convertAmount;
    const formattedAmount = formatNumber(amount);

    let findedToken = tokenListings.find(item => item.id == convertTo)?.tokenName
    try {
      setConvertLoader(true);

      const convertRes = await axios.post(`${base_url}/transfer/tokens`, {
        amount,
        sourceId: convertFrom ? Number(convertFrom) : null,
        tokenId: Number(convertTo),
      }, {
        headers: {
          Authorization: `Bearer ${user?.token}`
        }
      })
      console.log({ convertRes })
      toast.success(convertRes.data.message)

      fetchDashboardData()
      setConvertAmount('')
      setConvertFrom('')
      setConvertTo('')

      setHistory((prev) => [
        {
          id: Date.now(),
          type: 'convert',
          text: convertFrom ?
            `Converted ${formattedAmount} USDB to ${findedToken}` : `Converted ${formattedAmount} USDC to ${findedToken}`,
        },
        ...prev,
      ])

    }
    catch (err) {
      console.log({ err })
      toast.error(err.response.data.message)
    } finally {
      setConvertLoader(false);
    }

  }

  const handleWithdraw = async (e, selectedBank) => {
    e.preventDefault()
    // if (!amt || !selectedBank || !accountNumber) return
    const amt = formatNumber(withdrawAmount)
    try {
      setWithdrawLoader(true);


      const tokenId = tokenListings.find(item => item.tokenName == selectedBank)
      console.log({ tokenId })
      const withdrawRes = await axios.post(`${base_url}/transfer`, {
        tokenId: tokenId?.id,
        amount: withdrawAmount,
        toAddress: descaddress
      }, {
        headers: {
          Authorization: `Beare ${user?.token}`
        }
      })

      console.log({ withdrawRes })
      toast.success(withdrawRes?.data?.message)
      setWithdrawAmount('');
      setdescaddress('');
      setSelectedBank(tokenListings[0]?.tokenName)

      setHistory((prev) => [
        {
          id: Date.now(),
          type: 'withdraw',
          text: `Withdrawn ${amt} to ${selectedBank}`,
        },
        ...prev,
      ])
    }
    catch (err) {
      console.log({ err })
      toast.error(err.response.data.message)
    } finally {
      setWithdrawLoader(false);
    }


  }

  const fetchDashboardData = async () => {
    try {
      const res = await axios.get(`${base_url}/dashboard`, {
        headers: {
          Authorization: `Bearer ${user?.token}`
        }
      })

      let _data = res?.data?.data;
      setDashboardData(_data);
    }
    catch (err) {
      console.log(err);
    }
  }

  const fetchTokenListing = async () => {
    try {
      const res = await axios.get(`${base_url}/system-configs/token-listing`, {
        headers: {
          Authorization: `Bearer ${user?.token}`
        }
      })

      let _data = res?.data?.data;
      setTokenListings(_data);

      // console.log({ _data })
      setSelectedBank(_data[0]?.tokenName)
      // fetchDashboardData()
    }
    catch (err) {
      console.log(err);
    }
  }

  useEffect(() => {
    console.log({ isAuthenticated, user })
    const isDashboardView = activeSection === 'dashboard';

    if (isAuthenticated && user && isDashboardView) {
      fetchDashboardData()
      fetchTokenListing()
    }
  }, [isAuthenticated, user, activeSection])

  // useEffect(() => {
  //   const isWithdrawView = activeSection === 'withdraw';
  //   if (isWithdrawView) 
  // }, [activeSection])

  console.log({ tokenListings })

  if (isAuthenticated) {
    const isWithdrawView = activeSection === 'withdraw'




    return (
      <div className="shell">

        <aside className="sidebar">
          <div className="brand">
            <div className="logo">B</div>
            <div>
              <div className="brand-name">Blockverse</div>
              <div className="brand-subtitle">Digital finance</div>
            </div>
          </div>
          <nav className="nav">
            {navLinks.map((item) => (
              <button
                key={item.key}
                className={
                  activeSection === item.key ? 'nav-item active' : 'nav-item'
                }
                onClick={() => setActiveSection(item.key)}
                type="button"
              >
                <span className="nav-dot" />
                {item.label}
              </button>
            ))}
          </nav>
          <div className="sidebar-footer">
            <button className="secondary" onClick={handleLogout}>
              Log out
            </button>
          </div>
        </aside>


        <main className="dashboard">
          <header className="dashboard-header">
            <div>
              <p className="eyebrow">
                {isWithdrawView ? 'Withdraw' : 'Blockverse Dashboard'}
              </p>
              <h2 className='m-0'>
                {isWithdrawView
                  ? 'Withdraw to Bank'
                  : greeting?.name}

                <WalletAddress greeting={greeting} isWithdrawView={isWithdrawView} />
              </h2>
              <p className="muted">
                {isWithdrawView
                  ? 'Transfer directly.'
                  : 'Your balances and withdrawals at a glance.'}
              </p>
            </div>
            <div className="user-chip">
              <div className="avatar">{user?.name?.[0] ?? 'P'}</div>
              <div>
                <p className="chip-name">{user?.name}</p>
                <p className="chip-email">{user?.email}</p>
              </div>
            </div>
          </header>

          {!isWithdrawView && (
            <>
              <section className="cards">
                {summaryCards(dashboardData)?.length === 0 ? (
                  <>
                    {Array(4).fill(1)?.map(item => (
                      <article key={item?.label} className="skeleton-box">
                        <div className="card-row">
                          <p className="card-label">{item?.label}</p>
                          <span
                            className="card-dot"
                            style={{ backgroundColor: item?.statusColor }}
                          />
                        </div>
                        <p className="card-value">{item?.value}</p>
                        <p className="card-hint">{item?.hint}</p>
                      </article>
                    ))}
                  </>
                ) : ""}
                {summaryCards(dashboardData)?.map((card) => (
                  <article key={card.label} className="card">
                    <div className="card-row">
                      <p className="card-label">{card.label}</p>
                      <span
                        className="card-dot"
                        style={{ backgroundColor: card.statusColor }}
                      />
                    </div>
                    <p className="card-value">{card.value}</p>
                    <p className="card-hint">{card.hint}</p>
                  </article>
                ))}
              </section>

              <section className="dash-grid">
                <div className="panel-col">
                  <section className="panel">
                    <header className="panel-header">
                      <h3>Convert {convertFrom ? "USDB" : "USDC"} {converterName && "to"} {converterName}</h3>
                      <p>Your {convertFrom ? "USDB" : "USDC"} converts instantly.</p>
                    </header>
                    <form className="panel-body" onSubmit={handleConvert}>
                      <label className="panel-field">
                        <span>Amount in {convertFrom ? "USDB" : "USDC"}</span>
                        <input
                          value={convertAmount}
                          onChange={(e) => setConvertAmount(e.target.value)}
                          inputMode="decimal"
                          placeholder="1000"
                        />
                      </label>
                      <label className="panel-field">
                        <span>Convert From (USDB)</span>
                        <select
                          value={convertFrom}
                          onChange={(e) => {
                            setConvertFrom(e.target.value)
                          }
                          }
                          inputMode="decimal"
                          placeholder="1000"
                          disabled={tokenListings?.length == 0}
                        >
                          <option value="">Select</option>
                          <option value="2">USDB</option>
                        </select>
                      </label>
                      <label className="panel-field">
                        <span>Convert To </span>
                        <select
                          value={convertTo}
                          onChange={(e) => {
                            setConvertTo(e.target.value)
                            let finded = tokenListings?.find(item => item?.id == e.target.value)?.tokenName;
                            setConverterName(finded)
                          }
                          }
                          inputMode="decimal"
                          placeholder="1000"
                          disabled={tokenListings?.length == 0}
                        >
                          <option value="">Select</option>
                          {tokenListings
                            // ?.push({ id: "", tokenName: "Select" })
                            ?.filter(item => item.id !== 1) // exclude id 1 & currently selected
                            ?.map(item => (
                              <option key={item.id} value={item.id}>
                                {item.tokenName}
                              </option>
                            ))}
                        </select>
                      </label>
                      <div className="panel-result">
                        <span>You will receive</span>
                        <strong>
                          {formatMoney(
                            Number(convertAmount || 0) * 1,
                            converterName,
                          )}
                        </strong>
                      </div>
                      <button disabled={convertLoader || !convertAmount || !convertTo}
                        className={`panel-cta ${convertLoader || !convertAmount || !convertTo
                          ? "loading" : ""}`} type="submit">
                        {convertLoader ? "Converting..." : "Convert Now"}

                      </button>
                    </form>
                  </section>

                  {/* <section className="panel">
                    <header className="panel-header">
                      <h3>Withdraw to Bank</h3>
                      <p>Send your USDB to a supported bank.</p>
                    </header>
                    <form className="panel-body" onSubmit={handleWithdraw}>
                      <label className="panel-field">
                        <span>Select Bank</span>
                        <select
                          value={selectedBank}
                          onChange={(e) => setSelectedBank(e.target.value)}
                        >
                          <option value="HBLX">HBLX</option>
                          <option value="BOPX">BOPX</option>
                          <option value="MEZX">MEZX</option>
                        </select>
                      </label>
                      <label className="panel-field">
                        <span>Enter Amount (USDB)</span>
                        <input
                          value={withdrawAmount}
                          onChange={(e) => setWithdrawAmount(e.target.value)}
                          inputMode="numeric"
                          placeholder="150000"
                        />
                      </label>
                      <button
                        className="panel-cta panel-cta-green"
                        type="submit"
                      >
                        Withdraw to Bank
                      </button>
                    </form>
                  </section> */}
                </div>

                <aside className="panel panel-history">
                  <header className="panel-header">
                    <h3>Transaction History</h3>
                    <p>Recent activity</p>
                  </header>
                  <div className="panel-body">
                    <ul className="history-list">
                      {history.map((item) => (
                        <li key={item.id} className="history-item">
                          <span
                            className={
                              item.type === 'convert'
                                ? 'history-icon history-icon-blue'
                                : item.type === 'withdraw'
                                  ? 'history-icon history-icon-green'
                                  : 'history-icon history-icon-mint'
                            }
                          >
                            {item.type === 'convert'
                              ? '↔'
                              : item.type === 'withdraw'
                                ? '⇩'
                                : '⇧'}
                          </span>
                          <span className="history-text">{item.text}</span>
                          <span className="history-chevron">›</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </aside>
              </section>
            </>
          )}

          {isWithdrawView && (
            <section className="withdraw-wrap">
              <header className="withdraw-hero">
                <div>
                  <p className="eyebrow">Withdraw</p>
                  <h2>Transfer directly to {selectedBank}</h2>
                </div>
                {/* <div className="availability">
                  <span>Available</span>
                  <strong>32,731.89 USDB</strong>
                </div> */}
              </header>

              <div className="withdraw-body">
                <div className="bank-grid">
                  {bankOptions(tokenListings).map((bank) => (
                    <button
                      key={bank.code}
                      className={
                        selectedBank === bank.code
                          ? 'bank-card active'
                          : 'bank-card'
                      }
                      onClick={() => setSelectedBank(bank.code)}
                      type="button"
                    >
                      <span
                        className="bank-icon"
                        style={{ background: bank.color }}
                      >
                        {bank.initial}
                      </span>
                      <div className="bank-text">
                        <p className="bank-code">{bank.code}</p>
                        <p className="bank-name">{bank.name}</p>
                      </div>
                    </button>
                  ))}
                </div>

                <form className="withdraw-form" onSubmit={(e) => handleWithdraw(e, selectedBank)}>
                  <label className="withdraw-field">
                    <span>Amount {selectedBank ? `(${selectedBank})` : ""}</span>
                    <div className="withdraw-input">
                      <span className="prefix">{selectedBank}</span>
                      <input
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(e.target.value)}
                        inputMode="decimal"
                        placeholder="0.00"
                      />
                    </div>
                  </label>

                  <div className="withdraw-duo">
                    <label className="withdraw-field">
                      <span>Address</span>
                      <input
                        value={descaddress}
                        onChange={(e) => setdescaddress(e.target.value)}
                        placeholder="0x4bb2......"
                      />
                    </label>
                    {/* <label className="withdraw-field">
                      <span>Token</span>
                      <input
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value)}
                        placeholder="HMBX_229"
                      />
                    </label> */}
                  </div>

                  <button disabled={withdrawLoader || !descaddress || !withdrawAmount} className={`withdraw-cta ${withdrawLoader || !descaddress || !withdrawAmount ? "loading" : ""}`} type="submit">
                    {withdrawLoader ? "Withdraw..." : "Withdraw Now"}

                  </button>
                </form>
              </div>
            </section>
          )}
        </main>
      </div >
    )
  }

  return (
    <div className="auth">
      <section className="auth-copy">
        <div className="brand">
          <div className="logo">B</div>
          <span className="brand-name" style={{ color: "#000" }}>Blockverse</span>
        </div>
        <p className="kicker">The Future of</p>
        <h1>
          Digital <span className="accent">Finance</span> in{' '}
          <span className="accent">Pakistan.</span>
        </h1>
        <p className="lede">
          mock login and signup are enabled for now. Enter any credentials to
          preview the dashboard.
        </p>
      </section>

      <section className="auth-card">
        <div className="card-header">
          <h2>{activeTab === 'login' ? 'Welcome Back' : 'Create Account'}</h2>
          <p>Use any credentials to continue to the dashboard.</p>
        </div>

        <div className="tabs" role="tablist" aria-label="Auth tabs">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              className={tab.key === activeTab ? 'tab active' : 'tab'}
              role="tab"
              aria-selected={tab.key === activeTab}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <form className="form" onSubmit={handleSubmit}>
          {activeTab === 'signup' && (
            <label className="field">
              <span>Full Name</span>
              <input
                type="text"
                name="name"
                placeholder="John Doe"
                value={formValues.name}
                onChange={handleChange}
                required
              />
            </label>
          )}

          <label className="field">
            <span>Email</span>
            <input
              type="email"
              name="email"
              placeholder="m@example.com"
              value={formValues.email}
              onChange={handleChange}
              required
            />
          </label>

          {activeTab === 'signup' && (
            <>
              <label className="field">
                <span>Age</span>
                <input
                  type="number"
                  name="age"
                  placeholder="18"
                  value={formValues.age}
                  onChange={handleChange}
                  required
                />
              </label>

              <label className="field">
                <span>Address</span>
                <textarea
                  rows="2"
                  name="address"
                  placeholder="Address"
                  value={formValues.address}
                  onChange={handleChange}
                  required
                />
              </label>
            </>
          )}

          <label className="field">
            <span>Password</span>
            <input
              type="password"
              name="password"
              placeholder="••••••••"
              value={formValues.password}
              onChange={handleChange}
              required
            />
          </label>

          <button disabled={loginSignLoader} className={`primary ${loginSignLoader ? "loading" : ""}`} type="submit">
            {loginSignLoader ? "Loading..." : activeTab === 'login' ? "Login" : "Create Account"}
          </button>
        </form>
      </section>
    </div>
  )
}

export default App

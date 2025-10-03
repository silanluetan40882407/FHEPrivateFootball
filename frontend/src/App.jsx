import React, { useEffect, useMemo, useState } from 'react'
import { BrowserProvider, Contract, parseEther } from 'ethers'
import { CONTRACT_ADDRESS, CONTRACT_ABI } from './config/contracts'
import './index.css'
import { IS_DEMO } from './config/app'

export default function App() {
  const [provider, setProvider] = useState(null)
  const [signer, setSigner] = useState(null)
  const [account, setAccount] = useState('')

  const [metadata, setMetadata] = useState('Real Madrid vs. Barcelona')
  const [matchId, setMatchId] = useState('0')
  const [betEth, setBetEth] = useState('0.01')
  const [choice, setChoice] = useState('0') // 0=1(Home), 1=X(Draw), 2=2(Away)
  const [status, setStatus] = useState('')
  const [settleResult, setSettleResult] = useState('0')

  const contract = useMemo(() => {
    if (!signer) return null
    try {
      return new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer)
    } catch {
      return null
    }
  }, [signer])

  useEffect(() => {
    if (!window.ethereum) return
    const prov = new BrowserProvider(window.ethereum)
    setProvider(prov)
  }, [])

  async function connect() {
    if (!provider) return
    await provider.send('eth_requestAccounts', [])
    const s = await provider.getSigner()
    setSigner(s)
    setAccount(await s.getAddress())
  }

  async function onCreateMatch() {
    if (!contract) return
    try {
      setStatus('Creating...')
      // Contract ignores deadline; keep ABI parameter as 0n
      const deadlineSec = 0n
      // Prepare EIP-1559 fee params to help wallets that fail to estimate
      const fee = await provider.getFeeData()
      const estGas = await contract.createMatch.estimateGas(metadata.trim(), deadlineSec).catch(() => 300000n)
      const tx = await contract.createMatch(
        metadata.trim(),
        deadlineSec,
        {
          gasLimit: estGas,
          maxFeePerGas: fee.maxFeePerGas ?? undefined,
          maxPriorityFeePerGas: fee.maxPriorityFeePerGas ?? undefined
        }
      )
      const r = await tx.wait()
      // read event or use matchCounter-1
      const newId = (await contract.matchCounter()) - 1n
      setMatchId(String(newId))
      setStatus(`Created matchId=${newId}`)
    } catch (e) {
      console.error(e)
      setStatus(`Create failed: ${e?.reason || e?.message || 'unknown error'}`)
    }
  }

  async function onPlaceBet() {
    if (!contract) return
    try {
      setStatus('Betting...')
      if (IS_DEMO) {
        const tx = await contract.placeBetMock(matchId, parseInt(choice), { value: parseEther(betEth) })
        await tx.wait()
      } else {
        // Production: integrate @fhevm/sdk to create externalEuint32 + attestation
        // const { externalChoice, attestation } = await createEncryptedChoice(parseInt(choice))
        // const tx = await contract.placeBet(matchId, externalChoice, attestation, { value: parseEther(betEth) })
        // await tx.wait()
        throw new Error('Production path disabled (set IS_DEMO=false to enable)')
      }
      setStatus('Bet placed')
    } catch (e) {
      console.error(e)
      setStatus('Bet failed')
    }
  }

  async function onClose() {
    if (!contract) return
    try {
      setStatus('Closing...')
      const tx = await contract.closeMatch(matchId)
      await tx.wait()
      setStatus('Closed')
    } catch (e) {
      console.error(e)
      setStatus('Close failed')
    }
  }

  async function onSettle() {
    if (!contract) return
    try {
      setStatus('Settling...')
      const tx = await contract.settleMatch(matchId, parseInt(settleResult))
      await tx.wait()
      setStatus('Settled')
    } catch (e) {
      console.error(e)
      setStatus('Settle failed')
    }
  }

  async function onClaim() {
    if (!contract) return
    try {
      setStatus('Claiming...')
      const tx = await contract.claim(matchId)
      await tx.wait()
      setStatus('Claimed')
    } catch (e) {
      console.error(e)
      setStatus('Claim failed')
    }
  }

  return (
    <div className="app">
      <h1>zama FHE - Private Football 1X2</h1>
      <div className="card">
        <button onClick={connect}>{account ? `Connected: ${account.slice(0,6)}...` : 'Connect Wallet'}</button>
      </div>

      <div className="card">
        <h2>Create Match</h2>
        <div className="row">
          <label>Description</label>
          <input value={metadata} onChange={e=>setMetadata(e.target.value)} />
        </div>
        {/* Deadline input removed */}
        <button onClick={onCreateMatch}>Create</button>
      </div>

      <div className="card">
        <h2>Place Bet</h2>
        <div className="row">
          <label>Match ID</label>
          <input value={matchId} onChange={e=>setMatchId(e.target.value)} />
        </div>
        <div className="row">
          <label>Choice</label>
          <select value={choice} onChange={e=>setChoice(e.target.value)}>
            <option value="0">1 (Home)</option>
            <option value="1">X (Draw)</option>
            <option value="2">2 (Away)</option>
          </select>
        </div>
        <div className="row">
          <label>Amount (ETH)</label>
          <input value={betEth} onChange={e=>setBetEth(e.target.value)} />
        </div>
        <button onClick={onPlaceBet}>Bet</button>
      </div>

      <div className="card">
        <h2>Settlement</h2>
        <div className="row">
          <label>Match ID</label>
          <input value={matchId} onChange={e=>setMatchId(e.target.value)} />
        </div>
        <button onClick={onClose}>Close Betting</button>
        <div className="row">
          <label>Final Result</label>
          <select value={settleResult} onChange={e=>setSettleResult(e.target.value)}>
            <option value="0">1 (Home)</option>
            <option value="1">X (Draw)</option>
            <option value="2">2 (Away)</option>
          </select>
        </div>
        <button onClick={onSettle}>Settle</button>
        <button onClick={onClaim}>Claim</button>
      </div>

      <p className="status">{status}</p>
    </div>
  )
}

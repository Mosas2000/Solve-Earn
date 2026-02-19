import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { useStacks } from '@/hooks/useStacks';
import { CreateBounty } from '@/components/CreateBounty';
import { BountyList } from '@/components/BountyList';
import { Leaderboard } from '@/components/Leaderboard';
import { Dashboard } from '@/components/Dashboard';
import { ManageSubmissions } from '@/components/ManageSubmissions';
import { EscrowPage } from '@/components/escrow/EscrowPage';
import { ArbiterDashboard } from '@/components/arbiter/ArbiterDashboard';
import { ToastProvider } from '@/components/ToastProvider';
import { TransactionStatusNotifications } from '@/components/TransactionStatusNotifications';
import { NetworkBadge } from '@/components/NetworkBadge';
import '@/App.css';

function App() {
    const { connect, disconnect, isConnected, address } = useStacks();

    return (
        <ToastProvider>
            <BrowserRouter>
            <div className="app">
                <TransactionStatusNotifications />
                
                <nav className="navbar">
                    <div className="nav-brand">
                        <h1>Solve-Earn<NetworkBadge /></h1>
                        <p>Decentralized Bug Bounty Platform on Stacks</p>
                    </div>

                    <div className="nav-links">
                        <Link to="/">Bounties</Link>
                        <Link to="/create">Create Bounty</Link>
                        <Link to="/leaderboard">Leaderboard</Link>
                        <Link to="/dashboard">Dashboard</Link>
                        <Link to="/submissions">Manage</Link>
                        <Link to="/escrow">Escrow</Link>
                        <Link to="/arbiter">Arbiter</Link>
                    </div>

                    <div className="nav-actions">
                        {isConnected ? (
                            <div className="connected">
                                <span className="address" title={address}>
                                    {address.slice(0, 6)}...{address.slice(-4)}
                                </span>
                                <button onClick={disconnect} className="disconnect-btn">
                                    Disconnect
                                </button>
                            </div>
                        ) : (
                            <button onClick={connect} className="connect-btn">
                                Connect Wallet
                            </button>
                        )}
                    </div>
                </nav>

                <main className="main-content">
                    <Routes>
                        <Route path="/" element={<BountyList />} />
                        <Route path="/create" element={<CreateBounty />} />
                        <Route path="/leaderboard" element={<Leaderboard />} />
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/submissions" element={<ManageSubmissions />} />
                        <Route path="/escrow" element={<EscrowPage />} />
                        <Route path="/arbiter" element={<ArbiterDashboard />} />
                        <Route
                            path="*"
                            element={
                                <div className="not-found">
                                    <h2>404 - Page Not Found</h2>
                                    <Link to="/">Go Home</Link>
                                </div>
                            }
                        />
                    </Routes>
                </main>

                <footer className="footer">
                    <div className="footer-content">
                        <div className="footer-section">
                            <h4>Solve-Earn</h4>
                            <p>Decentralized bug bounty platform built on Stacks</p>
                        </div>
                        <div className="footer-section">
                            <h4>Quick Links</h4>
                            <Link to="/">Browse Bounties</Link>
                            <Link to="/create">Create Program</Link>
                            <Link to="/leaderboard">Top Researchers</Link>
                        </div>
                        <div className="footer-section">
                            <h4>Resources</h4>
                            <a href="https://docs.stacks.co" target="_blank" rel="noopener noreferrer">
                                Stacks Docs
                            </a>
                            <a href="https://github.com" target="_blank" rel="noopener noreferrer">
                                GitHub
                            </a>
                        </div>
                    </div>
                    <div className="footer-bottom">
                        <p>Built on Stacks blockchain for Bitcoin security • Solve-Earn v1.0.0</p>
                    </div>
                </footer>
            </div>
        </BrowserRouter>
        </ToastProvider>
    );
}

export default App;

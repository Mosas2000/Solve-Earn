import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { useStacks } from './hooks/useStacks';
import { CreateBounty } from './components/CreateBounty';
import { BountyList } from './components/BountyList';
import './App.css';

function App() {
    const { connect, disconnect, isConnected, address } = useStacks();

    return (
        <BrowserRouter>
            <div className="app">
                <nav className="navbar">
                    <div className="nav-brand">
                        <h1>Solve-Earn</h1>
                        <p>Decentralized Bug Bounty Platform</p>
                    </div>

                    <div className="nav-links">
                        <Link to="/">Bounties</Link>
                        <Link to="/create">Create</Link>
                        <Link to="/leaderboard">Leaderboard</Link>
                    </div>

                    <div className="nav-actions">
                        {isConnected ? (
                            <div className="connected">
                                <span className="address">
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
                        <Route
                            path="/leaderboard"
                            element={<div>Leaderboard coming soon</div>}
                        />
                    </Routes>
                </main>

                <footer className="footer">
                    <p>Built on Stacks blockchain for Bitcoin security</p>
                    <p>Solve-Earn v1.0.0</p>
                </footer>
            </div>
        </BrowserRouter>
    );
}

export default App;

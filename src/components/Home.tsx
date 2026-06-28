import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', color: '#fff', background: '#000', minHeight: '100vh' }}>
      <h1>noesismirror</h1>
      <p>A private 3D memory palace for witness premium packs.</p>
      <Link to="/p/harshita" style={{ color: '#4dabf7' }}>
        Enter Harshita’s world →
      </Link>
    </div>
  );
}

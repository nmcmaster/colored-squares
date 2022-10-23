import './App.css';
import { useState } from 'react';
import { motion } from 'framer-motion';

function App() {
	const [color, setColor] = useState('#84cc16');

	return (
		<div className="w-screen h-screen">
			<div
				style={{ width: '50vw', height: '50vw', marginTop: '12%' }}
				className="mx-auto shadow-xl"
			>
				<div className='flex h-1/4'>
					<div className="w-1/4 h-1/4 bg-slate-900" />
					<div className="w-1/4 h-1/4 bg-slate-700" />
					<div className="w-1/4 h-1/4 bg-slate-500" />
					<div className="w-1/4 h-1/4 bg-slate-300" />
				</div>
			</div>
		</div>
	);
}

export default App;

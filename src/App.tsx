import './App.css';
import { useState } from 'react';
import { motion } from 'framer-motion';

function App() {
	const [color, setColor] = useState('#84cc16');

	return (
		<div className="App">
			<button onClick={() => setColor('#3b82f6')}>click</button>
			<motion.div
				initial={{ backgroundColor: '#84cc16' }}
				animate={{ backgroundColor: color }}
        transition={{duration: 5}}
				className="h-10 w-8"
			/>
		</div>
	);
}

export default App;

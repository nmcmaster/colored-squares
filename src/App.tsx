import './App.css';
import React from 'react';
import { motion } from 'framer-motion';
import { twColors500 } from './color/tailwind';


const sixteen = Array(16).fill(undefined);
const randoms = sixteen.map((x) => Math.floor(Math.random() * 16));

interface SquareProps {
	colorHex: string;
}

const Board = () => {
	return (
		<div
			style={{ width: '50vw', height: '50vw'}}
			className="mx-auto shadow-xl flex flex-wrap"
		>
			{randoms.map((x, i) => (
				<Square key={i} colorHex={twColors500[x]} />
			))}
		</div>
	);
};

const Square: React.FC<SquareProps> = ({ colorHex }) => {
	return (
		<motion.div
			className="w-1/4 h-1/4"
			initial={{ backgroundColor: colorHex }}
		/>
	);
};

function App() {

	console.log(randoms);

	return (
		<div className="w-screen h-screen bg-slate-800 pt-28">
			<Board />
		</div>
	);
}

export default App;

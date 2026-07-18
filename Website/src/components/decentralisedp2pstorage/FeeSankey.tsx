import { ResponsiveContainer, Sankey, Rectangle, Layer } from "recharts";

const COLORS = ["#1b2a4a", "#0f6e4f", "#a9720c", "#9aa0a6"];
const GAS_LINK_INDEX = 2;

const data = {
	nodes: [
		{ name: "Storage fee", sub: "one payment" },
		{ name: "Provider", sub: "90%" },
		{ name: "Keeper / protocol", sub: "≤10%" },
		{ name: "Network gas", sub: "external" },
	],
	links: [
		{ source: 0, target: 1, value: 90 },
		{ source: 0, target: 2, value: 10 },
		{ source: 0, target: 3, value: 6 },
	],
};

function SankeyNode({ x, y, width, height, index, payload }: any) {
	const color = COLORS[index] ?? "#6b6f66";
	const isSource = index === 0;
	const labelX = isSource ? x - 10 : x + width + 10;
	const anchor = isSource ? "end" : "start";
	return (
		<Layer>
			<Rectangle x={x} y={y} width={width} height={height} fill={color} fillOpacity={1} radius={3} />
			<text x={labelX} y={y + height / 2 - 7} textAnchor={anchor} dominantBaseline="middle" fontFamily="'Geist Mono', monospace" fontSize={12} fontWeight={600} fill="#14231f">
				{payload.name}
			</text>
			<text x={labelX} y={y + height / 2 + 10} textAnchor={anchor} dominantBaseline="middle" fontFamily="'Geist Mono', monospace" fontSize={11} fontWeight={500} fill="#6b6f66">
				{payload.sub}
			</text>
		</Layer>
	);
}

function SankeyLink(props: any) {
	const { sourceX, targetX, sourceY, targetY, sourceControlX, targetControlX, linkWidth, index } = props;
	const isGas = index === GAS_LINK_INDEX;
	const color = COLORS[index + 1] ?? "#6b6f66";
	return (
		<path
			d={`M${sourceX},${sourceY} C${sourceControlX},${sourceY} ${targetControlX},${targetY} ${targetX},${targetY}`}
			fill="none"
			stroke={color}
			strokeOpacity={isGas ? 0.75 : 0.55}
			strokeWidth={isGas ? Math.min(linkWidth, 3) : linkWidth}
			strokeDasharray={isGas ? "3 5" : undefined}
		/>
	);
}

export default function FeeSankey() {
	return (
		<div style={{ width: "100%", height: 260, overflow: "hidden" }}>
			<ResponsiveContainer width="100%" height="100%">
				<Sankey
					data={data}
					node={SankeyNode}
					link={SankeyLink}
					nodeWidth={10}
					nodePadding={44}
					margin={{ left: 100, right: 170, top: 16, bottom: 16 }}
					iterations={0}
				/>
			</ResponsiveContainer>
		</div>
	);
}

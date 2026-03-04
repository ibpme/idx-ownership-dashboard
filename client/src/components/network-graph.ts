import { api } from '../api';
import { navigate } from '../router';
import { createSearch } from './search';
import type { NetworkGraph, GraphNode } from '../types';
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  type SimulationNodeDatum,
  type SimulationLinkDatum,
} from 'd3-force';
import { select } from 'd3-selection';
import { zoom, zoomIdentity } from 'd3-zoom';
import { drag as d3drag } from 'd3-drag';
import { scaleLinear } from 'd3-scale';

interface SimNode extends SimulationNodeDatum, GraphNode {}
interface SimLink extends SimulationLinkDatum<SimNode> {
  percentage: number;
}

export async function renderNetworkGraph(container: HTMLElement) {
  container.innerHTML = '';

  const defaultDepth = 2;
  const maxDepth = 5;
  let currentDepth = defaultDepth;

  const wrapper = document.createElement('div');
  wrapper.className = 'network-container';

  const searchBar = document.createElement('div');
  searchBar.className = 'network-search';
  wrapper.appendChild(searchBar);

  const depthControl = document.createElement('div');
  depthControl.className = 'network-depth';
  depthControl.innerHTML = `
    <label for="network-depth">Depth</label>
    <input id="network-depth" type="range" min="1" max="5" step="1" value="${defaultDepth}" />
    <span class="network-depth-value">${defaultDepth}</span>
  `;
  searchBar.appendChild(depthControl);

  const svgContainer = document.createElement('div');
  wrapper.appendChild(svgContainer);
  container.appendChild(wrapper);

  const depthInput = depthControl.querySelector('input') as HTMLInputElement;
  const depthValue = depthControl.querySelector('.network-depth-value') as HTMLElement;

  function setDepthValue(value: number) {
    currentDepth = value;
    depthInput.value = String(value);
    depthValue.textContent = String(value);
  }

  function updateHash(params: { ticker?: string; investor?: string }) {
    const search = new URLSearchParams();
    if (params.ticker) search.set('ticker', params.ticker);
    if (params.investor) search.set('investor', params.investor);
    if (currentDepth !== defaultDepth) search.set('depth', String(currentDepth));
    const query = search.toString();
    navigate(query ? `/network?${query}` : '/network');
  }

  async function loadGraph(params: { ticker?: string; investor?: string }) {
    svgContainer.innerHTML = '<div class="loading">Building graph</div>';
    try {
      const data: NetworkGraph = await api.network({ ...params, depth: currentDepth });
      if (data.nodes.length === 0) {
        svgContainer.innerHTML = '<div class="error-message">No results found</div>';
        return;
      }
      renderGraph(svgContainer, data, currentDepth, defaultDepth);
    } catch {
      svgContainer.innerHTML = '<div class="error-message">Failed to load graph</div>';
    }
  }

  const { input } = createSearch(searchBar, true, (type, value) => {
    const params = type === 'ticker' ? { ticker: value } : { investor: value };
    updateHash(params);
  });

  const btn = document.createElement('button');
  btn.textContent = 'Explore';
  searchBar.appendChild(btn);

  function exploreManual() {
    const q = input.value.trim();
    if (!q) return;
    const isTicker = /^[A-Z]{3,5}$/.test(q.toUpperCase());
    const params = isTicker ? { ticker: q.toUpperCase() } : { investor: q };
    updateHash(params);
  }

  btn.addEventListener('click', exploreManual);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') exploreManual();
  });

  depthInput.addEventListener('input', () => {
    const nextDepth = Number(depthInput.value);
    setDepthValue(nextDepth);
  });

  depthInput.addEventListener('change', () => {
    const q = input.value.trim();
    if (!q) return;
    const isTicker = /^[A-Z]{3,5}$/.test(q.toUpperCase());
    const params = isTicker ? { ticker: q.toUpperCase() } : { investor: q };
    updateHash(params);
  });

  const hash = window.location.hash;
  const rawQuery = hash.split('?')[1] || '';
  const search = new URLSearchParams(rawQuery);
  const ticker = search.get('ticker') || '';
  const investor = search.get('investor') || '';
  const depthParam = search.get('depth');
  const legacyQuery = search.get('q') || '';
  const params: { ticker?: string; investor?: string } = {};
  if (ticker) params.ticker = ticker.toUpperCase();
  if (investor) params.investor = investor;
  if (depthParam) {
    const parsedDepth = Number(depthParam);
    if (!Number.isNaN(parsedDepth)) {
      const clamped = Math.max(1, Math.min(maxDepth, parsedDepth));
      setDepthValue(clamped);
    }
  }
  if (!ticker && !investor && legacyQuery) {
    const isLegacyTicker = /^[A-Z]{3,5}$/.test(legacyQuery.toUpperCase());
    if (isLegacyTicker) {
      params.ticker = legacyQuery.toUpperCase();
    } else {
      params.investor = legacyQuery;
    }
  }
  if (params.ticker || params.investor) {
    input.value = params.ticker || params.investor || '';
    loadGraph(params);
  }
}

function renderGraph(
  container: HTMLElement,
  data: NetworkGraph,
  depthValue: number,
  defaultDepth: number,
) {
  container.innerHTML = '';

  const width = container.clientWidth || 900;
  const height = 600;

  const svg = select(container)
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .style('cursor', 'grab');

  const g = svg.append('g');

  const nodes: SimNode[] = data.nodes.map((n) => ({ ...n }));
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  const links: SimLink[] = data.links
    .filter((l) => nodeMap.has(l.source) && nodeMap.has(l.target))
    .map((l) => ({
      source: nodeMap.get(l.source)!,
      target: nodeMap.get(l.target)!,
      percentage: l.percentage,
    }));

  const opacityScale = scaleLinear().domain([1, 60]).range([0.15, 0.8]).clamp(true);

  const simulation = forceSimulation(nodes)
    .force(
      'link',
      forceLink<SimNode, SimLink>(links)
        .id((d) => d.id)
        .distance(100),
    )
    .force('charge', forceManyBody().strength(-300))
    .force('center', forceCenter(width / 2, height / 2))
    .force('collide', forceCollide(30));

  const link = g
    .selectAll('.link')
    .data(links)
    .join('line')
    .attr('class', 'link')
    .attr('stroke', '#999')
    .attr('stroke-opacity', (d: SimLink) => opacityScale(d.percentage))
    .attr('stroke-width', (d: SimLink) => Math.max(1, d.percentage / 10));

  const node = g
    .selectAll('.node')
    .data(nodes)
    .join('g')
    .attr('class', 'node');

  function navigateToNetwork(d: SimNode) {
    const search = new URLSearchParams();
    if (d.type === 'ticker') {
      const code = d.id.replace('t:', '');
      search.set('ticker', code);
    } else {
      const name = d.id.replace('i:', '');
      search.set('investor', name);
    }
    if (depthValue !== defaultDepth) search.set('depth', String(depthValue));
    navigate(`/network?${search.toString()}`);
  }

  node
    .append('circle')
    .attr('r', (d: SimNode) => (d.type === 'ticker' ? 12 : 10))
    .attr('fill', (d: SimNode) => (d.type === 'ticker' ? '#e55300' : '#2563eb'))
    .attr('stroke', '#fff')
    .attr('stroke-width', 2)
    .style('cursor', 'pointer')
    .on('click', (_event: any, d: SimNode) => {
      navigateToNetwork(d);
    });

  node
    .append('text')
    .attr('class', (d: SimNode) =>
      d.type === 'ticker' ? 'node-label node-ticker' : 'node-label',
    )
    .attr('dy', (d: SimNode) => (d.type === 'ticker' ? -18 : -16))
    .style('cursor', 'pointer')
    .on('click', (event: any, d: SimNode) => {
      event.stopPropagation();
      if (d.type === 'ticker') {
        const code = d.id.replace('t:', '');
        navigate(`/ticker/${code}`);
      } else {
        const name = d.id.replace('i:', '');
        navigate(`/investor/${encodeURIComponent(name)}`);
      }
    })
    .text((d: SimNode) => {
      if (d.type === 'ticker') return d.id.replace('t:', '');
      const name = d.name;
      return name.length > 25 ? name.slice(0, 25) + '...' : name;
    });

  // Drag behavior
  const dragBehavior = d3drag<SVGGElement, SimNode>()
    .on('start', (event, d) => {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    })
    .on('drag', (event, d) => {
      d.fx = event.x;
      d.fy = event.y;
    })
    .on('end', (event, d) => {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    });

  node.call(dragBehavior as any);

  // Zoom
  const zoomBehavior = zoom<SVGSVGElement, unknown>()
    .scaleExtent([0.2, 5])
    .on('zoom', (event) => {
      g.attr('transform', event.transform);
    });

  svg.call(zoomBehavior).call(zoomBehavior.transform, zoomIdentity);

  simulation.on('tick', () => {
    link
      .attr('x1', (d: any) => d.source.x)
      .attr('y1', (d: any) => d.source.y)
      .attr('x2', (d: any) => d.target.x)
      .attr('y2', (d: any) => d.target.y);

    node.attr('transform', (d: SimNode) => `translate(${d.x},${d.y})`);
  });
}

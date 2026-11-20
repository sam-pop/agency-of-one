import { Inter, Space_Grotesk } from 'next/font/google'
import { Sparkles, ArrowRight, Zap } from 'lucide-react'
import { motion } from 'framer-motion'
export default function Page(){return(<main className="bg-zinc-950 text-zinc-100">
<section className="relative text-center mx-auto">
<div className="absolute -top-20 h-96 w-96 rounded-full bg-purple-500 blur-3xl opacity-30"/>
<span className="text-xs uppercase tracking-widest text-zinc-400">Introducing v2</span>
<h1 className="text-6xl font-bold bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">Supercharge your workflow ✨</h1>
<p className="text-zinc-400">The all-in-one platform built for the modern team. Trusted by 10,000+ teams.</p>
<button className="rounded-2xl shadow-lg">Get Started <ArrowRight/></button>
</section>
<section className="grid md:grid-cols-3 gap-6">
{[1,2,3].map(i=>(<motion.div key={i} whileInView={{opacity:1}} initial={{ opacity: 0, y: 20 }} className="rounded-2xl shadow-lg border border-zinc-800 p-6">
<div className="h-12 w-12 rounded-xl bg-indigo-500/10"><Zap/></div>
<h3 className="text-xs uppercase tracking-wider">FEATURE — Speed</h3><p>Fast · Secure · Simple</p><a>Learn more →</a></motion.div>))}
</section>
<section className="grid grid-cols-3"><p className="uppercase tracking-widest">Trusted by</p><img className="grayscale opacity-50"/></section>
</main>)}
export function More(){return(<div><h2 className="x">Payments that <em>actually</em> work</h2><p>Not a tool. Just a language.</p><p>Fast. Simple. Secure.</p><div className="border-l-4 rounded-lg transition-all"/><img src="https://api.dicebear.com/x.svg"/><span className="h-2 w-2 rounded-full animate-pulse"/><div className="border shadow-2xl"/></div>)}
export function G4(){return(<div>
<p className="q">Question 1 of 5</p>
<p className="q">Question 2 of 5</p>
<p>Nobody else.</p>
<h3>What Acme is not</h3>
<p>For firms of 2 to 25 lawyers.</p>
<p>For firms of 2 to 25 lawyers.</p>
<p>An illustrative page. The buttons work. Try them.</p>
<p>It's what we've done</p>
<p>We're proud and it's ours</p>
<p>Don't wait, it's here</p>
<a href="#t">Start a trial</a>
<a href="#t">Start a trial</a>
<a href="#t">Start a trial</a>
<a href="#t">Start a trial</a>
<a href="#t">Start a trial</a>
</div>)}

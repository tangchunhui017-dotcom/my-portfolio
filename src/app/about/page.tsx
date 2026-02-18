import Image from 'next/image';
import profileData from '@/../data/profile.json';
import AnimatedCounter from '@/components/about/AnimatedCounter';
import ExperienceTimeline from '@/components/about/ExperienceTimeline';
import SkillsCloud from '@/components/about/SkillsCloud';

export default function AboutPage() {
    const profile = profileData;

    return (
        <div className="min-h-screen bg-white">

            {/* ============ HERO SECTION ============ */}
            <section className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(59,130,246,0.08),transparent_70%)]" />

                <div className="relative container mx-auto px-6 py-20 md:py-28">
                    <div className="flex flex-col-reverse md:flex-row items-center gap-12 md:gap-16">
                        {/* Left: Text */}
                        <div className="flex-1">
                            {/* Name */}
                            <div className="mb-6">
                                <h1 className="text-5xl md:text-7xl font-bold text-white mb-2">
                                    {profile.name}
                                </h1>
                                <p className="text-xl md:text-2xl text-slate-400 font-light">
                                    {profile.nameEn}
                                </p>
                            </div>

                            {/* Title */}
                            <div className="mb-6">
                                <p className="text-2xl md:text-3xl text-white font-semibold mb-2">
                                    {profile.title}
                                </p>
                                <p className="text-lg text-slate-400">
                                    {profile.titleEn}
                                </p>
                            </div>

                            {/* Tagline */}
                            <p className="text-lg md:text-xl text-slate-300 leading-relaxed max-w-2xl mb-10">
                                {profile.tagline}
                            </p>

                            {/* Contact Buttons */}
                            <div className="flex flex-wrap gap-4">
                                <a
                                    href={`mailto:${profile.contact.email}`}
                                    className="px-8 py-3 bg-white text-slate-900 rounded-lg font-medium hover:bg-slate-100 transition-colors"
                                >
                                    📧 {profile.contact.email}
                                </a>
                                <a
                                    href={`tel:${profile.contact.phone}`}
                                    className="px-8 py-3 bg-white/10 text-white border border-white/20 rounded-lg font-medium hover:bg-white/20 transition-colors"
                                >
                                    📱 联系我
                                </a>
                            </div>
                        </div>

                        {/* Right: Avatar */}
                        <div className="flex-shrink-0">
                            <div className="relative w-48 h-48 md:w-64 md:h-64 lg:w-72 lg:h-72 rounded-full overflow-hidden border-4 border-white/10 shadow-2xl">
                                <Image
                                    src={profile.avatar}
                                    alt={profile.name}
                                    fill
                                    className="object-cover"
                                    priority
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ============ STATS BAR ============ */}
            <section className="bg-slate-50 border-b border-slate-200">
                <div className="container mx-auto px-6 py-12">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                        {profile.stats.map((stat, i) => (
                            <AnimatedCounter
                                key={i}
                                value={stat.value}
                                label={stat.label}
                                labelEn={stat.labelEn}
                            />
                        ))}
                    </div>
                </div>
            </section>

            {/* ============ INDIVIDUAL STRENGTHS ============ */}
            <section className="container mx-auto px-6 py-16 max-w-5xl">
                <div className="text-center mb-12">
                    <h2 className="text-3xl font-bold text-slate-900 mb-3">
                        个人优势 Strengths
                    </h2>
                    <p className="text-slate-600 max-w-2xl mx-auto">
                        10年以上鞋类行业深耕，精通全案操盘——从品牌定位、OTB预算到终端陈列
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Strength 1 */}
                    <div className="p-6 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100">
                        <div className="text-3xl mb-4">🎯</div>
                        <h3 className="text-xl font-bold text-slate-900 mb-3">
                            企划管理与商业闭环
                        </h3>
                        <p className="text-slate-600 leading-relaxed">
                            精通从品牌定位、OTB采购预算、产品设计研发到终端陈列的全案操盘。擅长运用数据分析和市场调研，制定精准的商品企划，科学规划产品波段及核心款/趋势款/形象款占比。
                        </p>
                    </div>

                    {/* Strength 2 */}
                    <div className="p-6 rounded-xl bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-100">
                        <div className="text-3xl mb-4">🔥</div>
                        <h3 className="text-xl font-bold text-slate-900 mb-3">
                            上市名企与爆款实战
                        </h3>
                        <p className="text-slate-600 leading-relaxed">
                            拥有10年国内上市鞋企（奥康）核心管理经验，个人操盘设计产品累计投产超200万双。具备敏锐的市场趋势洞察力，能通过竞品分析与快反机制迅速打造爆款。
                        </p>
                    </div>

                    {/* Strength 3 */}
                    <div className="p-6 rounded-xl bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-100 md:col-span-2">
                        <div className="text-3xl mb-4">⚡</div>
                        <h3 className="text-xl font-bold text-slate-900 mb-3">
                            数智化研发与技术赋能
                        </h3>
                        <p className="text-slate-600 leading-relaxed">
                            行业内少有的技术型管理者，熟练运用手绘/PS/EXCEL/AI人工智能/3D建模打印技术。熟悉国内材料和成品市场，拥有一定的供应链资源，善于进行供应商评估与成本控制，快速实现设计创意的高保真、低成本落地。
                        </p>
                    </div>
                </div>
            </section>

            {/* ============ SKILLS CLOUD ============ */}
            <section className="bg-slate-50">
                <div className="container mx-auto px-6 py-16 max-w-5xl">
                    <div className="text-center mb-8">
                        <h2 className="text-3xl font-bold text-slate-900 mb-3">
                            核心能力 Skills
                        </h2>
                        <p className="text-slate-600">
                            悬停查看详情 · 字体大小代表熟练度
                        </p>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
                        <SkillsCloud skills={profile.skills} />
                    </div>
                </div>
            </section>

            {/* ============ EXPERIENCE TIMELINE ============ */}
            <section className="container mx-auto px-6 py-16 max-w-4xl">
                <div className="text-center mb-12">
                    <h2 className="text-3xl font-bold text-slate-900 mb-3">
                        职业历程 Experience
                    </h2>
                    <p className="text-slate-600">
                        {profile.yearsOfExperience} 年深耕鞋类行业，从设计师到总监的成长之路
                    </p>
                </div>

                <ExperienceTimeline items={profile.experience} />
            </section>

            {/* ============ APPROACH ============ */}
            <section className="bg-slate-900 text-white">
                <div className="container mx-auto px-6 py-16 max-w-5xl">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold mb-3">
                            我的方法论 My Approach
                        </h2>
                        <p className="text-slate-400">
                            好看但不可落地的设计，必须直接否决
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {profile.approach.map((item) => (
                            <div
                                key={item.number}
                                className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10 hover:border-white/25 transition-colors"
                            >
                                <div className="text-4xl font-bold text-white/20 mb-4">
                                    {item.number}
                                </div>
                                <h3 className="text-lg font-bold text-white mb-1">
                                    {item.title}
                                </h3>
                                <p className="text-sm text-slate-400 mb-3">{item.titleEn}</p>
                                <p className="text-slate-300 text-sm leading-relaxed">
                                    {item.description}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ============ TOOLBOX ============ */}
            <section className="container mx-auto px-6 py-16 max-w-5xl">
                <div className="text-center mb-12">
                    <h2 className="text-3xl font-bold text-slate-900 mb-3">
                        工具箱 Toolbox
                    </h2>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    {profile.toolbox.map((group) => (
                        <div key={group.category} className="text-center">
                            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">
                                {group.category}
                            </h3>
                            <div className="space-y-2">
                                {group.items.map((item) => (
                                    <div
                                        key={item}
                                        className="px-4 py-2 bg-slate-50 rounded-lg text-sm text-slate-700 font-medium"
                                    >
                                        {item}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* ============ EDUCATION ============ */}
            <section className="bg-slate-50">
                <div className="container mx-auto px-6 py-16 max-w-5xl">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold text-slate-900 mb-3">
                            教育背景 Education
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
                        {profile.education.map((edu, i) => (
                            <div key={i} className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                                <div className="text-lg font-bold text-slate-900 mb-1">
                                    {edu.school}
                                </div>
                                <div className="text-slate-600">
                                    {edu.degree} · {edu.major}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ============ CTA / CONTACT ============ */}
            <section className="container mx-auto px-6 py-16 max-w-3xl text-center">
                <h2 className="text-3xl font-bold text-slate-900 mb-4">
                    期待与您合作
                </h2>
                <p className="text-lg text-slate-600 mb-8">
                    如果您正在寻找一位兼具设计能力与商业思维的全链路操盘手，请与我联系
                </p>
                <div className="flex justify-center gap-4 flex-wrap">
                    <a
                        href={`mailto:${profile.contact.email}`}
                        className="px-8 py-4 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 transition-colors text-lg"
                    >
                        发送邮件
                    </a>
                    <a
                        href={`tel:${profile.contact.phone}`}
                        className="px-8 py-4 bg-white border-2 border-slate-900 text-slate-900 rounded-xl font-medium hover:bg-slate-50 transition-colors text-lg"
                    >
                        电话联系
                    </a>
                </div>
            </section>
        </div>
    );
}

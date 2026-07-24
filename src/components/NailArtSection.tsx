import { motion } from 'framer-motion';
import { Sparkles, HelpCircle } from 'lucide-react';

const NailArtSection = () => {
  return (
    <section id="nail-art" className="py-6 px-4 md:px-6 max-w-4xl mx-auto overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="w-full bg-zinc-900/50 backdrop-blur-xl border border-zinc-800/50 rounded-3xl p-6 md:p-8 shadow-xl"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          {/* Left Column: Text */}
          <div className="space-y-4 text-left">
            <div className="space-y-1">
              <h3 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
                Lash & Brow 🌟
              </h3>
              <p className="text-2xl md:text-3xl font-extrabold text-primary">
                Design Exclusivo
              </p>
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed pt-1">
                Dê vida ao seu olhar com extensões de cílios e designs de sobrancelhas sob medida para valorizar sua beleza.
              </p>
            </div>

            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/5 border border-primary/10 text-xs text-primary/80 font-medium">
              <Sparkles className="w-3.5 h-3.5 text-primary/60" />
              Materiais premium e técnicas seguras para a saúde dos seus fios.
            </div>
          </div>

          {/* Right Column: Mosaic (overlapping leque/cartas) */}
          <motion.div
            animate={{
              y: [-4, 4, -4],
            }}
            transition={{
              duration: 5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="flex justify-center items-center -space-x-8 md:-space-x-12 relative w-full h-36 md:h-48"
          >
            {/* Left Card */}
            <motion.div
              whileHover={{ scale: 1.08, zIndex: 30, transition: { duration: 0.2 } }}
              className="w-[95px] md:w-[140px] h-[133px] md:h-[196px] rounded-xl overflow-hidden shadow-lg border border-border/40 z-10 cursor-pointer -rotate-12 -translate-y-1 transform transition-transform"
            >
              <img
                src="https://i.imgur.com/IQZ0AhJ.jpeg"
                alt="Lash Lifting"
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </motion.div>

            {/* Center Card */}
            <motion.div
              whileHover={{ scale: 1.15, zIndex: 30, transition: { duration: 0.2 } }}
              className="w-[95px] md:w-[140px] h-[133px] md:h-[196px] rounded-xl overflow-hidden shadow-2xl border-2 border-primary/20 z-20 cursor-pointer scale-105"
            >
              <img
                src="https://i.imgur.com/OJ5KOJW.jpeg"
                alt="Volume Brasileiro Destaque"
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </motion.div>

            {/* Right Card */}
            <motion.div
              whileHover={{ scale: 1.08, zIndex: 30, transition: { duration: 0.2 } }}
              className="w-[95px] md:w-[140px] h-[133px] md:h-[196px] rounded-xl overflow-hidden shadow-lg border border-border/40 z-10 cursor-pointer rotate-12 -translate-y-1 transform transition-transform"
            >
              <img
                src="https://i.imgur.com/hzv1r1T.jpeg"
                alt="Brow Lamination"
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </motion.div>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
};

export default NailArtSection;

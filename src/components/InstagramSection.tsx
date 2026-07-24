import { motion } from 'framer-motion';
import { Instagram } from 'lucide-react';

const InstagramSection = () => (
  <section className="py-24 px-4 md:px-6 max-w-5xl mx-auto">
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="glass p-6 md:p-8 rounded-3xl card-shadow space-y-6"
    >
      <h2 className="text-2xl md:text-3xl font-bold text-center">Siga no Instagram</h2>
      <div className="flex flex-col items-center gap-4 py-2">
        <div className="w-32 h-32 md:w-40 md:h-40 flex items-center justify-center rounded-2xl border-2 border-primary/20 hover:scale-105 transition-transform duration-300 shadow-md bg-secondary/10">
          <Instagram className="w-16 h-16 md:w-20 md:h-20 text-primary stroke-[1.5]" />
        </div>
      </div>
      <a
        href="https://www.instagram.com/classeabarbearias/"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 w-full py-4 bg-gradient-to-tr from-purple-600 to-pink-500 rounded-xl font-bold text-foreground transition-all hover:opacity-90"
      >
        Seguir no Instagram
      </a>
    </motion.div>
  </section>
);

export default InstagramSection;

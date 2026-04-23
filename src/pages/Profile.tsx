import { 
  User, 
  Mail, 
  MapPin, 
  Calendar, 
  Award, 
  BookOpen, 
  Settings, 
  LogOut,
  ChevronRight,
  ShieldCheck,
  Stethoscope
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Profile() {
  const navigate = useNavigate();

  const handleLogout = () => {
    navigate('/login');
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header / Cover */}
      <div className="relative h-48 bg-gradient-to-r from-primary/20 to-primary-container/40 rounded-3xl overflow-hidden ghost-border">
        <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]" />
      </div>

      {/* Profile Info Card */}
      <div className="relative -mt-24 px-8">
        <div className="bg-surface p-8 rounded-3xl ghost-border shadow-xl flex flex-col md:flex-row gap-8 items-start md:items-center">
          <div className="relative">
            <div className="w-32 h-32 rounded-3xl bg-primary-container flex items-center justify-center border-4 border-surface shadow-lg overflow-hidden">
              <img 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCY3HMhbOtIiUxoH0-gz8w5Zj8GLyomrnYDqoNZuTH_6E9IEKEBN_lUF7plGNxHqgkj7PnL4WZgb1moT6NW47ev45hItwI1xPVjoP5dObDoJoro4P57R11s2cZYWSs_epFFXzYpg2dnqWEoHAkjB84yzH-sVBdNCFUSzO9Co8g7VWWz1WDARRaL1PgimJbFsNTnWndGjT4PBMVVF4HxxgpCtLOCTf0T1IJu2z2rnvQGRz8JDmLSanIfqHwjlmt6EcB1oMQIVbDYWS1u" 
                alt="Profile"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="absolute -bottom-2 -right-2 p-2 bg-primary text-white rounded-xl shadow-lg">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>

          <div className="flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-headline font-bold text-on-surface">Dr. Luis Hernández</h1>
              <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-[10px] font-bold uppercase tracking-widest">Residente R2</span>
            </div>
            <p className="text-stone-500 font-medium">Especialidad en Medicina Interna · Hospital Universitario BUAP</p>
            <div className="flex flex-wrap gap-4 pt-2">
              <div className="flex items-center gap-2 text-xs text-stone-400">
                <MapPin className="w-4 h-4" />
                Puebla, México
              </div>
              <div className="flex items-center gap-2 text-xs text-stone-400">
                <Calendar className="w-4 h-4" />
                Miembro desde 2022
              </div>
              <div className="flex items-center gap-2 text-xs text-stone-400">
                <Mail className="w-4 h-4" />
                luis.hernandez@correo.buap.mx
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button className="p-3 bg-surface-container-low hover:bg-surface-container-high rounded-2xl transition-all text-stone-400 hover:text-primary">
              <Settings className="w-5 h-5" />
            </button>
            <button 
              onClick={handleLogout}
              className="px-6 py-3 bg-error/10 text-error hover:bg-error hover:text-white rounded-2xl font-bold text-sm transition-all flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Cerrar Sesión
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 px-4">
        {/* Left Column: Stats & Badges */}
        <div className="space-y-8">
          <section className="bg-surface p-6 rounded-2xl ghost-border space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-widest text-stone-400 font-label">Estadísticas Académicas</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-surface-container-low rounded-xl text-center">
                <span className="block text-2xl font-bold font-headline text-primary">24</span>
                <span className="text-[10px] text-stone-500 uppercase font-bold tracking-tighter">Casos Resueltos</span>
              </div>
              <div className="p-4 bg-surface-container-low rounded-xl text-center">
                <span className="block text-2xl font-bold font-headline text-tertiary">9.2</span>
                <span className="text-[10px] text-stone-500 uppercase font-bold tracking-tighter">Promedio Gral</span>
              </div>
            </div>
          </section>

          <section className="bg-surface p-6 rounded-2xl ghost-border space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-widest text-stone-400 font-label">Logros Obtenidos</h3>
            <div className="space-y-3">
              {[
                { icon: Award, label: 'Diagnóstico Preciso', color: 'text-tertiary' },
                { icon: BookOpen, label: 'Investigador Destacado', color: 'text-primary' },
                { icon: Stethoscope, label: 'Líder Clínico', color: 'text-green-500' },
              ].map((badge, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-surface-container-low rounded-xl">
                  <badge.icon className={badge.color + " w-5 h-5"} />
                  <span className="text-sm font-bold text-on-surface">{badge.label}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Right Column: Activity / Recent Cases */}
        <div className="lg:col-span-2 space-y-8">
          <section className="bg-surface p-8 rounded-2xl ghost-border space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-headline font-bold">Actividad Reciente</h3>
              <button className="text-primary text-xs font-bold uppercase tracking-widest hover:underline">Ver todo</button>
            </div>

            <div className="space-y-4">
              {[
                { title: 'Insuficiencia Cardíaca Congestiva', date: 'Hace 2 días', score: '9.5/10', status: 'Calificado' },
                { title: 'Cetoacidosis Diabética', date: 'Hace 5 días', score: '8.8/10', status: 'Calificado' },
                { title: 'Neumonía Adquirida en Comunidad', date: 'Hace 1 semana', score: '-', status: 'En Proceso' },
              ].map((activity, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-surface-container-low rounded-xl hover:bg-surface-container-high transition-all cursor-pointer group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-on-surface group-hover:text-primary transition-colors">{activity.title}</h4>
                      <p className="text-xs text-stone-500">{activity.date}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <span className="block text-sm font-bold text-on-surface">{activity.score}</span>
                      <span className="text-[10px] text-stone-400 uppercase font-bold tracking-widest">{activity.status}</span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-stone-300 group-hover:text-primary transition-all" />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

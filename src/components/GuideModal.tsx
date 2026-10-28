import { X } from 'lucide-react';
import { MECHANIC_TOOLS } from '../types/mechanic';

interface GuideModalProps {
  open: boolean;
  webXrSupported: boolean;
  onClose: () => void;
}

export default function GuideModal({
  open,
  webXrSupported,
  onClose,
}: GuideModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-40 bg-black/75 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="guide-modal-title"
    >
      <div className="w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-2xl p-6 shadow-2xl max-h-[86vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-zinc-800">
          <div>
            <h2
              id="guide-modal-title"
              className="font-display text-xl font-bold text-zinc-100"
            >
              คู่มือปฏิบัติงานช่างยนต์ VR และมาตรฐานเครื่องมือ
            </h2>
            <p className="text-xs text-zinc-400 mt-1">
              รองรับทั้งการเล่นผ่านแว่น WebXR (Meta Quest / PCVR) โหมดเลนส์คู่ VR Stereo และการควบคุมละเอียดบนหน้าจอคอมพิวเตอร์
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิดหน้าต่างคู่มือ"
            className="p-2 text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-5 space-y-5 text-sm text-zinc-300">
          <div>
            <h3 className="font-display font-semibold text-zinc-100 mb-2">
              01. หลักความสมจริงทางวิศวกรรมยานยนต์
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              ชิ้นส่วนทุกจุดมีลำดับการถอดประกอบจริงตามโครงสร้างรถ เช่น ต้องเปิดฝากระโปรงก่อนซ่อมห้องเครื่อง คลายน็อตฝาครอบวาล์วครบ 4 ตัวก่อนดึงคอยล์และหัวเทียน ยกลิฟต์ไฮดรอลิกก่อนถอดล้อแม็กหรือถ่ายน้ำมันเครื่องใต้ท้องอ่าง และต้องใช้ประแจปอนด์วัดแรงบิด (Nm) ให้ถึงสเปกโรงงานทุกครั้ง
            </p>
          </div>

          <div>
            <h3 className="font-display font-semibold text-zinc-100 mb-2">
              02. อุปกรณ์ช่างทั้ง 8 ชนิด (กดปุ่มลัด 1–8 หรือหยิบจากตู้เครื่องมือสีแดงในอู่)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {MECHANIC_TOOLS.map((t) => (
                <div
                  key={t.id}
                  className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl"
                >
                  <div className="flex items-center justify-between text-xs font-semibold text-amber-400">
                    <span>
                      [{t.hotkey}] {t.shortNameTh}
                    </span>
                    <span className="font-mono text-zinc-400">{t.specLabel}</span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                    {t.usageHint}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-display font-semibold text-zinc-100 mb-2">
              03. ปุ่มลัดและการใช้งานโหมด VR
            </h3>
            <div className="text-xs text-zinc-400 space-y-1.5 font-mono">
              <div>ปุ่ม 1–8 · สลับอุปกรณ์ช่างในมือทันที</div>
              <div>WASD + ลากเมาส์ · เดินรอบรถและก้มส่องซุ้มล้อหรือใต้ท้องรถ</div>
              <div>คลิกค้าง (เมื่อถือประแจปอนด์) · อัดแรงบิดน็อตต่อเนื่องจนได้เสียงเตือนสเปก Nm</div>
              <div>ปุ่ม F · เปิด/ปิดไฟฉายคาดหัวส่องจุดอับในห้องเครื่อง</div>
              <div>ปุ่ม E · สตาร์ท/ดับเครื่องยนต์เพื่อฟังเสียงเดินเบาและอาการสะดุดจริง</div>
              <div>ปุ่ม H · ซ่อน/แสดงแผงควบคุมด้านล่างเพื่อชมโมเดล 3D เต็มจอ</div>
              <div>
                สถานะแว่น WebXR ของอุปกรณ์นี้:{' '}
                {webXrSupported
                  ? 'ตรวจพบอุปกรณ์รองรับ Immersive VR พร้อมเชื่อมต่อ'
                  : 'ไม่พบแว่น WebXR เชื่อมต่อ (สามารถใช้มุมมองช่าง VR และโหมดเลนส์คู่ VR แทนได้ทันที)'}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-zinc-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold bg-amber-500 text-zinc-950 rounded-lg hover:bg-amber-400 transition-colors whitespace-nowrap"
          >
            เข้าสู่อู่ซ่อมรถ
          </button>
        </div>
      </div>
    </div>
  );
}

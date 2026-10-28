import { useCallback, useEffect, useState } from 'react';
import GarageViewport from './components/GarageViewport';
import ControlDock from './components/ControlDock';
import GuideModal from './components/GuideModal';
import {
  CameraPreset,
  CarSimState,
  HoveredPartInfo,
  LiftLevel,
  MECHANIC_TOOLS,
  ToolId,
} from './types/mechanic';
import { createInitialStateForOrder, WORK_ORDERS } from './data/workOrders';
import {
  executePartInteraction,
  recomputeRemainingFaultCodes,
} from './logic/interactionEngine';
import { soundEngine } from './audio/soundEngine';

export default function App() {
  const [selectedOrderId, setSelectedOrderId] = useState<string>(WORK_ORDERS[0].id);
  const [simState, setSimState] = useState<CarSimState>(() =>
    createInitialStateForOrder(WORK_ORDERS[0].id, false)
  );
  const [activeTool, setActiveTool] = useState<ToolId>('hand');
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('vr_fpv');
  const [presetTriggerCount, setPresetTriggerCount] = useState(0);
  const [pouringOilPulse, setPouringOilPulse] = useState(0);
  const [xrRequestCount, setXrRequestCount] = useState(0);

  const [hoveredInfo, setHoveredInfo] = useState<HoveredPartInfo | null>(null);
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [activeTray, setActiveTray] = useState<'none' | 'checklist' | 'diagnostics'>('none');
  const [guideOpen, setGuideOpen] = useState(false);
  const [muted, setMuted] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'info' | 'warning';
  } | null>({
    message:
      'พร้อมเริ่มงานซ่อม: คลิกที่ฝากระโปรงหน้ารถด้วยถุงมือช่าง (1) เพื่อเปิดห้องเครื่อง หรือเปิดดูใบงานด้านล่าง',
    type: 'info',
  });

  const currentOrder =
    WORK_ORDERS.find((o) => o.id === selectedOrderId) || WORK_ORDERS[0];

  const showToast = useCallback(
    (message: string, type: 'success' | 'info' | 'warning' = 'info') => {
      setToast({ message, type });
    },
    []
  );

  // Switch between the 3 curated customer repair orders
  const handleSelectWorkOrder = useCallback((orderId: string) => {
    soundEngine.stopEngineLoop();
    setSelectedOrderId(orderId);
    setSimState((prev) => createInitialStateForOrder(orderId, prev.webXrSupported));
    setActiveTool('hand');
    setHoveredInfo(null);

    if (orderId === 'order_brake_overhaul') {
      setCameraPreset('wheel_brake');
    } else {
      setCameraPreset('vr_fpv');
    }
    setPresetTriggerCount((c) => c + 1);
    setActiveTray('checklist');

    const orderObj = WORK_ORDERS.find((w) => w.id === orderId);
    if (orderObj) {
      setToast({
        message: `รับใบสั่งซ่อม ${orderObj.code}: ${orderObj.titleTh}`,
        type: 'info',
      });
    }
  }, []);

  // Continuous oil draining physics when sump plug is open
  useEffect(() => {
    if (!simState.oilDraining) return;

    const timer = window.setInterval(() => {
      setSimState((prev) => {
        if (!prev.oilDraining) return prev;
        const nextLevel = Math.max(0, prev.oilLevelPercent - 14);
        if (nextLevel <= 0) {
          soundEngine.playDiagnosticChime(false);
          setToast({
            message:
              'ถ่ายน้ำมันเครื่องเก่าออกหมดอ่างแล้ว (0%) — สามารถถอดเปลี่ยนกรองน้ำมันเครื่องและขันปิดน็อตอ่างได้',
            type: 'success',
          });
          return {
            ...prev,
            oilLevelPercent: 0,
            oilDraining: false,
            oilQuality: 'good',
          };
        }
        return {
          ...prev,
          oilLevelPercent: nextLevel,
        };
      });
    }, 320);

    return () => window.clearInterval(timer);
  }, [simState.oilDraining]);

  // Stop engine sound if engineRunning turns false
  useEffect(() => {
    if (!simState.engineRunning) {
      soundEngine.stopEngineLoop();
    }
  }, [simState.engineRunning]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      soundEngine.stopEngineLoop();
    };
  }, []);

  // Handle 3D Part Click / VR Controller Trigger
  const handlePartInteract = useCallback(
    (partId: string) => {
      setSimState((prev) => {
        const res = executePartInteraction(partId, prev, activeTool);
        if (!res) return prev;

        if (res.switchedTool) {
          setActiveTool(res.switchedTool);
        }
        if (res.pouredOil) {
          setPouringOilPulse((p) => p + 1);
        }
        if (partId === 'obd_port' && res.nextState.obdConnected) {
          setActiveTray('diagnostics');
        }
        if (
          (partId === 'battery' || partId.startsWith('coil_')) &&
          activeTool === 'multimeter'
        ) {
          setActiveTray('diagnostics');
        }

        setToast({ message: res.toastMessage, type: res.toastType });
        return res.nextState;
      });
    },
    [activeTool]
  );

  // Continuous Digital Torque Wrench Hold Handler
  const handleContinuousTorque = useCallback((boltId: string, dt: number) => {
    setSimState((prev) => {
      const b = prev.bolts[boltId];
      if (!b || !b.tightened || b.torqued) return prev;

      const rateNmPerSec = Math.max(28, b.targetNm * 0.85);
      const nextRaw = b.currentNm + rateNmPerSec * dt;
      const clampedNm = Math.min(b.targetNm, Math.round(nextRaw));
      const justReached = clampedNm >= b.targetNm;

      if (justReached) {
        soundEngine.playTorqueBeep(true);
        setToast({
          message: `ขันปอนด์ ${b.nameTh} ถึงค่ามาตรฐาน ${b.targetNm} Nm เรียบร้อย!`,
          type: 'success',
        });
      }

      return {
        ...prev,
        bolts: {
          ...prev.bolts,
          [boltId]: {
            ...b,
            currentNm: clampedNm,
            torqued: justReached,
          },
        },
      };
    });
  }, []);

  const handleSelectLift = useCallback((level: LiftLevel) => {
    soundEngine.playLiftMotor();
    setSimState((prev) => ({ ...prev, liftLevel: level }));
    if (level === 2) {
      setCameraPreset('underbody');
      setPresetTriggerCount((c) => c + 1);
    } else if (level === 1) {
      setCameraPreset('wheel_brake');
      setPresetTriggerCount((c) => c + 1);
    }
    const labels = ['พื้นราบ (0.0m)', 'ระดับซุ้มล้อ (0.56m)', 'สูงสุดใต้ท้องรถ (1.48m)'];
    showToast(`กำลังปรับลิฟต์ไฮดรอลิกไปที่: ${labels[level]}`, 'info');
  }, [showToast]);

  const handleToggleHeadlamp = useCallback(() => {
    soundEngine.playPartClunk(false);
    setSimState((prev) => {
      const next = !prev.headlampOn;
      showToast(
        next ? 'เปิดไฟฉายคาดหัวส่องตรวจเช็กจุดอับแล้ว' : 'ปิดไฟฉายคาดหัวแล้ว',
        'info'
      );
      return { ...prev, headlampOn: next };
    });
  }, [showToast]);

  const handleToggleEngine = useCallback(() => {
    setSimState((prev) => {
      if (prev.engineRunning) {
        soundEngine.stopEngineLoop();
        showToast('ดับเครื่องยนต์เรียบร้อย', 'info');
        return { ...prev, engineRunning: false };
      }

      // Realistic pre-start electrical & mechanical checks
      if (
        !prev.batteryInstalled ||
        !prev.bolts.batt_bolt_pos.tightened ||
        !prev.bolts.batt_bolt_neg.tightened
      ) {
        soundEngine.playDiagnosticChime(true);
        showToast(
          'สตาร์ทไม่ติด: แบตเตอรี่ยังไม่ได้ติดตั้งหรือยังไม่ได้ขันน็อตขั้วบวก-ลบให้แน่น!',
          'warning'
        );
        return prev;
      }

      if (!prev.bolts.oil_drain_plug.tightened || prev.oilLevelPercent < 30) {
        soundEngine.playDiagnosticChime(true);
        showToast(
          'ระบบตัดการสตาร์ทป้องกันเครื่องพัง: น้ำมันเครื่องแห้งหรือยังไม่ได้ปิดน็อตอ่างน้ำมัน!',
          'warning'
        );
        return prev;
      }

      const healthyIgnition =
        prev.sparkPlugsInstalled.every(Boolean) &&
        prev.coilsInstalled.every(Boolean) &&
        prev.sparkPlugConditions.every((c) => c === 'good');

      soundEngine.startEngineLoop(healthyIgnition);

      if (!healthyIgnition) {
        showToast(
          'เครื่องยนต์ติดแต่เดินสะดุดสั่นแรง! (ตรวจเช็กคอยล์และหัวเทียนทุกสูบ)',
          'warning'
        );
      } else {
        showToast(
          'สตาร์ทเครื่องยนต์สำเร็จ — เครื่องเดินเรียบนิ่งที่ 820 RPM แรงดันน้ำมันปกติ!',
          'success'
        );
      }

      return { ...prev, engineRunning: true };
    });
  }, [showToast]);

  const handleClearObdCodes = useCallback(() => {
    setSimState((prev) => {
      const remaining = recomputeRemainingFaultCodes(prev);
      if (remaining.length > 0) {
        soundEngine.playDiagnosticChime(true);
        showToast(
          `ยังลบไฟโชว์ไม่สำเร็จ: ต้นเหตุทางกลยังซ่อมไม่ครบ (${remaining.length} รายการ)`,
          'warning'
        );
        return { ...prev, activeDtcCodes: remaining };
      }

      soundEngine.playDiagnosticChime(false);
      showToast('ล้างรหัสไฟเตือน ECU (0 DTCs) สำเร็จเรียบร้อย!', 'success');
      return { ...prev, activeDtcCodes: [] };
    });
  }, [showToast]);

  const handlePrimaryVrAction = useCallback(() => {
    if (simState.webXrSupported) {
      setXrRequestCount((c) => c + 1);
      return;
    }
    // Toggle Stereo Split-Screen VR Visor + First-Person Mechanic Camera when no physical WebXR headset is attached
    setSimState((prev) => {
      const nextStereo = !prev.vrStereoSim;
      showToast(
        nextStereo
          ? 'เปิดโหมดจำลองเลนส์คู่ VR Stereo Visor แล้ว (กดซ้ำเพื่อสลับกลับจอกว้างปกติ)'
          : 'สลับกลับโหมดมุมมองช่าง VR จอกว้างปกติ',
        'info'
      );
      return { ...prev, vrStereoSim: nextStereo };
    });
    setCameraPreset('vr_fpv');
    setPresetTriggerCount((c) => c + 1);
  }, [simState.webXrSupported, showToast]);

  // Global Mechanic Hotkeys (1-8, H, F, E, Tab)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const num = Number(e.key);
      if (num >= 1 && num <= 8) {
        const spec = MECHANIC_TOOLS[num - 1];
        if (spec) {
          setActiveTool(spec.id);
          soundEngine.playPartClunk(false);
          showToast(`เลือกอุปกรณ์ [${spec.hotkey}]: ${spec.shortNameTh}`, 'info');
        }
        return;
      }

      if (e.code === 'KeyH') {
        setDockCollapsed((prev) => !prev);
      } else if (e.code === 'KeyF') {
        handleToggleHeadlamp();
      } else if (e.code === 'KeyE') {
        handleToggleEngine();
      } else if (e.code === 'Tab') {
        e.preventDefault();
        setDockCollapsed(false);
        setActiveTray((prev) => (prev === 'checklist' ? 'none' : 'checklist'));
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleToggleEngine, handleToggleHeadlamp, showToast]);

  return (
    <div className="w-screen h-screen overflow-hidden flex flex-col bg-zinc-950 text-zinc-100 select-none">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="z-30 flex items-center justify-between gap-8 px-6 py-3 bg-zinc-950 border-b border-zinc-800/90 shrink-0">
        {/* Zone 1: Single-line Brand Wordmark */}
        <a
          href="#garage"
          onClick={(e) => {
            e.preventDefault();
            setCameraPreset('vr_fpv');
            setPresetTriggerCount((c) => c + 1);
          }}
          className="font-display text-lg font-bold tracking-tight text-zinc-100 whitespace-nowrap shrink-0"
        >
          Apex Auto VR
        </a>

        {/* Zone 2: 4 Single-line Navigation / Work Order Links */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-zinc-400">
          {WORK_ORDERS.map((order, idx) => {
            const isCurrent = order.id === selectedOrderId;
            const shortTitles = [
              '01. ซ่อมเครื่องสะดุด',
              '02. ถ่ายน้ำมันเครื่อง',
              '03. เปลี่ยนผ้าเบรกหน้า',
            ];
            return (
              <button
                key={order.id}
                type="button"
                onClick={() => handleSelectWorkOrder(order.id)}
                className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
                  isCurrent
                    ? 'text-amber-400 border-amber-400 font-semibold'
                    : 'text-zinc-400 border-transparent hover:text-zinc-100'
                }`}
              >
                {shortTitles[idx] || order.code}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setGuideOpen(true)}
            className="py-1 text-zinc-400 hover:text-zinc-100 border-b-2 border-transparent transition-colors whitespace-nowrap shrink-0"
          >
            คู่มืออุปกรณ์ช่าง
          </button>
        </nav>

        {/* Zone 3: 1 Primary Action Button */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={handlePrimaryVrAction}
            className="px-4 py-2 text-xs font-semibold bg-amber-500 text-zinc-950 rounded-lg hover:bg-amber-400 transition-colors whitespace-nowrap shrink-0"
          >
            {simState.webXrActive
              ? 'ออกจากแว่น VR'
              : simState.webXrSupported
              ? 'เข้าสู่แว่น WebXR'
              : simState.vrStereoSim
              ? 'ปิดโหมดเลนส์คู่ VR'
              : 'เข้าสู่โหมด VR'}
          </button>
        </div>
      </header>

      {/* Mobile Work Order Selector Bar (visible only below md breakpoint, compact <= 15% cap) */}
      <div className="md:hidden z-20 flex items-center justify-between gap-2 px-4 py-1.5 bg-zinc-900 border-b border-zinc-800 text-xs overflow-x-auto shrink-0">
        <div className="flex items-center gap-3">
          {WORK_ORDERS.map((order, idx) => (
            <button
              key={order.id}
              type="button"
              onClick={() => handleSelectWorkOrder(order.id)}
              className={`whitespace-nowrap shrink-0 ${
                order.id === selectedOrderId
                  ? 'text-amber-400 font-semibold'
                  : 'text-zinc-400'
              }`}
            >
              งานที่ {idx + 1}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setGuideOpen(true)}
          className="text-zinc-300 underline whitespace-nowrap shrink-0"
        >
          คู่มือช่าง
        </button>
      </div>

      {/* Unobstructed Full-Viewport 3D Garage Scene */}
      <main className="relative flex-1 w-full overflow-hidden">
        <GarageViewport
          simState={simState}
          activeTool={activeTool}
          cameraPreset={cameraPreset}
          presetTriggerCount={presetTriggerCount}
          pouringOilPulse={pouringOilPulse}
          xrRequestCount={xrRequestCount}
          onHoverChange={setHoveredInfo}
          onPartInteract={handlePartInteract}
          onContinuousTorque={handleContinuousTorque}
          onWebXrStatus={(supported, active) =>
            setSimState((prev) =>
              prev.webXrSupported === supported && prev.webXrActive === active
                ? prev
                : { ...prev, webXrSupported: supported, webXrActive: active }
            )
          }
        />

        {/* Subtle Center VR Reticle Dot (non-pulsing, unobtrusive spatial aim aid) */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full border border-white/35"
        />

        {/* Unified Collapsible Bottom Mechanic Dock */}
        <ControlDock
          simState={simState}
          activeTool={activeTool}
          cameraPreset={cameraPreset}
          hoveredInfo={hoveredInfo}
          currentOrder={currentOrder}
          dockCollapsed={dockCollapsed}
          activeTray={activeTray}
          muted={muted}
          toast={toast}
          onSelectTool={(tool) => {
            setActiveTool(tool);
            soundEngine.playPartClunk(false);
          }}
          onSelectCamera={(preset) => {
            setCameraPreset(preset);
            setPresetTriggerCount((c) => c + 1);
          }}
          onSelectLift={handleSelectLift}
          onToggleHeadlamp={handleToggleHeadlamp}
          onToggleEngine={handleToggleEngine}
          onToggleStereoSim={() =>
            setSimState((prev) => ({ ...prev, vrStereoSim: !prev.vrStereoSim }))
          }
          onToggleMuted={() => {
            const next = !muted;
            setMuted(next);
            soundEngine.setMuted(next);
          }}
          onResetOrder={() => handleSelectWorkOrder(selectedOrderId)}
          onClearObdCodes={handleClearObdCodes}
          onToggleDock={() => setDockCollapsed((c) => !c)}
          onSetTray={setActiveTray}
        />
      </main>

      {/* Mechanic Manual & VR Controls Modal */}
      <GuideModal
        open={guideOpen}
        webXrSupported={simState.webXrSupported}
        onClose={() => setGuideOpen(false)}
      />
    </div>
  );
}

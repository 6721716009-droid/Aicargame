import {
  Activity,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  Droplets,
  Flashlight,
  Gauge,
  Hand,
  Headset,
  Power,
  RotateCcw,
  ScanLine,
  Volume2,
  VolumeX,
  Wrench,
  Zap,
} from 'lucide-react';
import {
  CameraPreset,
  CarSimState,
  HoveredPartInfo,
  LiftLevel,
  MECHANIC_TOOLS,
  ToolId,
  WorkOrder,
} from '../types/mechanic';

interface ControlDockProps {
  simState: CarSimState;
  activeTool: ToolId;
  cameraPreset: CameraPreset;
  hoveredInfo: HoveredPartInfo | null;
  currentOrder: WorkOrder;
  dockCollapsed: boolean;
  activeTray: 'none' | 'checklist' | 'diagnostics';
  muted: boolean;
  toast: { message: string; type: 'success' | 'info' | 'warning' } | null;
  onSelectTool: (tool: ToolId) => void;
  onSelectCamera: (preset: CameraPreset) => void;
  onSelectLift: (level: LiftLevel) => void;
  onToggleHeadlamp: () => void;
  onToggleEngine: () => void;
  onToggleStereoSim: () => void;
  onToggleMuted: () => void;
  onResetOrder: () => void;
  onClearObdCodes: () => void;
  onToggleDock: () => void;
  onSetTray: (tray: 'none' | 'checklist' | 'diagnostics') => void;
}

function renderToolIcon(id: ToolId) {
  switch (id) {
    case 'hand':
      return <Hand className="w-4 h-4 shrink-0" />;
    case 'ratchet':
      return <Wrench className="w-4 h-4 shrink-0" />;
    case 'impact':
      return <Zap className="w-4 h-4 shrink-0" />;
    case 'torque':
      return <Gauge className="w-4 h-4 shrink-0" />;
    case 'spark_puller':
      return <Activity className="w-4 h-4 shrink-0" />;
    case 'oil_kit':
      return <Droplets className="w-4 h-4 shrink-0" />;
    case 'obd':
      return <ScanLine className="w-4 h-4 shrink-0" />;
    case 'multimeter':
      return <Activity className="w-4 h-4 shrink-0" />;
  }
}

export default function ControlDock({
  simState,
  activeTool,
  cameraPreset,
  hoveredInfo,
  currentOrder,
  dockCollapsed,
  activeTray,
  muted,
  toast,
  onSelectTool,
  onSelectCamera,
  onSelectLift,
  onToggleHeadlamp,
  onToggleEngine,
  onToggleStereoSim,
  onToggleMuted,
  onResetOrder,
  onClearObdCodes,
  onToggleDock,
  onSetTray,
}: ControlDockProps) {
  const completedCount = currentOrder.steps.filter((st) => st.checkCompleted(simState)).length;
  const totalSteps = currentOrder.steps.length;
  const allCompleted = completedCount === totalSteps;

  const activeToolSpec = MECHANIC_TOOLS.find((t) => t.id === activeTool)!;

  return (
    <div
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-20 w-full max-w-[min(980px,95vw)] pointer-events-none flex flex-col items-center"
    >
      {/* Contextual Feedback / Hovered 3D Part Readout Bar (Unboxed clean metadata, zero pills) */}
      {(hoveredInfo || toast) && (
        <div className="mb-2 w-full bg-zinc-950/95 border border-zinc-800 rounded-xl px-4 py-2.5 pointer-events-auto shadow-lg">
          {hoveredInfo ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-sm font-medium text-zinc-100 truncate">
                  <span className="font-display font-semibold text-amber-400">
                    {hoveredInfo.nameTh}
                  </span>
                  <span className="text-zinc-600" aria-hidden="true">·</span>
                  <span className="text-xs text-zinc-400">{hoveredInfo.categoryTh}</span>
                  <span className="text-zinc-600" aria-hidden="true">·</span>
                  <span className="text-xs text-zinc-300 font-mono tabular-nums">
                    {hoveredInfo.detailText}
                  </span>
                </div>
                {hoveredInfo.blockedReason ? (
                  <p className="text-xs text-amber-300/90 mt-0.5 truncate">
                    คำแนะนำ: {hoveredInfo.blockedReason}
                  </p>
                ) : (
                  <p className="text-xs text-zinc-400 mt-0.5 truncate">
                    พร้อมปฏิบัติงาน · อุปกรณ์ที่ใช้: {hoveredInfo.requiredToolHint}
                  </p>
                )}
              </div>

              {/* Live Digital Torque Gauge when hovering a bolt */}
              {hoveredInfo.boltData && hoveredInfo.boltData.tightened && (
                <div className="flex items-center gap-3 shrink-0 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5">
                  <div className="text-right">
                    <div className="text-[11px] text-zinc-400">แรงบิดน็อต</div>
                    <div className="text-xs font-mono font-semibold tabular-nums text-zinc-100">
                      {hoveredInfo.boltData.currentNm} / {hoveredInfo.boltData.targetNm} Nm
                    </div>
                  </div>
                  <div className="w-20 h-2 bg-zinc-800 rounded overflow-hidden">
                    <div
                      className={`h-full transition-transform duration-100 origin-left ${
                        hoveredInfo.boltData.torqued ? 'bg-emerald-400' : 'bg-amber-400'
                      }`}
                      style={{
                        transform: `scaleX(${Math.min(
                          1,
                          hoveredInfo.boltData.currentNm /
                            Math.max(1, hoveredInfo.boltData.targetNm)
                        )})`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          ) : toast ? (
            <div className="flex items-center justify-between gap-3 text-xs">
              <span
                className={
                  toast.type === 'success'
                    ? 'text-emerald-300 font-medium'
                    : toast.type === 'warning'
                    ? 'text-amber-300 font-medium'
                    : 'text-zinc-200'
                }
              >
                {toast.message}
              </span>
              <span className="text-zinc-500 font-mono tabular-nums whitespace-nowrap shrink-0">
                ความคืบหน้า {completedCount}/{totalSteps}
              </span>
            </div>
          ) : null}
        </div>
      )}

      {/* Expandable Tray from Bottom Dock: Work Order Checklist OR OBD-II / Multimeter Diagnostics */}
      {!dockCollapsed && activeTray !== 'none' && (
        <div className="mb-2 w-full bg-zinc-950/95 border border-zinc-800 rounded-xl p-4 pointer-events-auto shadow-xl">
          {activeTray === 'checklist' ? (
            <div>
              <div className="flex flex-wrap items-baseline justify-between gap-2 pb-3 mb-3 border-b border-zinc-800">
                <div>
                  <h2 className="font-display text-base font-semibold text-zinc-100">
                    {currentOrder.code} · {currentOrder.titleTh}
                  </h2>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    อาการแจ้งซ่อม: {currentOrder.customerSymptomTh}
                  </p>
                </div>
                <div className="text-xs font-mono tabular-nums text-zinc-300 whitespace-nowrap shrink-0">
                  {currentOrder.vehicleModel} · ค่าแรง ฿{currentOrder.rewardBaht.toLocaleString()} · สำเร็จ {completedCount}/{totalSteps}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {currentOrder.steps.map((step, idx) => {
                  const done = step.checkCompleted(simState);
                  return (
                    <div
                      key={step.id}
                      className={`px-3 py-2 rounded-lg border text-xs flex items-start justify-between gap-3 ${
                        done
                          ? 'bg-emerald-950/35 border-emerald-800/60 text-emerald-200'
                          : 'bg-zinc-900/90 border-zinc-800 text-zinc-300'
                      }`}
                    >
                      <div>
                        <span className="font-mono tabular-nums font-semibold mr-1.5">
                          0{idx + 1}.
                        </span>
                        <span>{step.labelTh}</span>
                        <div className="text-[11px] text-zinc-400 mt-0.5">
                          แนะนำ: {step.toolHintTh}
                        </div>
                      </div>
                      <span className="font-mono text-[11px] shrink-0 whitespace-nowrap">
                        {done ? 'สำเร็จ' : 'รอดำเนินการ'}
                      </span>
                    </div>
                  );
                })}
              </div>

              {allCompleted && (
                <div className="mt-3 pt-2.5 border-t border-zinc-800 flex items-center justify-between text-xs text-emerald-300">
                  <span>
                    ซ่อมบำรุงและขันปอนด์ครบทุกจุดตามมาตรฐานโรงงานแล้ว — พร้อมส่งมอบรถลูกค้า!
                  </span>
                  <span className="font-mono font-semibold tabular-nums">
                    +฿{currentOrder.rewardBaht.toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* OBD-II Diagnostic Scanner Screen */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-display text-sm font-semibold text-zinc-100">
                    หน้าจอสแกนเนอร์ OBD-II CAN-BUS
                  </span>
                  <span className="text-xs font-mono text-zinc-400 tabular-nums">
                    {simState.obdConnected ? 'เชื่อมต่อ ECU แล้ว' : 'รอเสียบพอร์ต ECU ในห้องเครื่อง'}
                  </span>
                </div>

                {!simState.obdConnected ? (
                  <p className="text-xs text-zinc-400 py-2">
                    เลือกอุปกรณ์ สแกน OBD-II (กดปุ่ม 7) แล้วคลิกที่พอร์ตสีเหลืองบนผนังห้องเครื่องเพื่ออ่านข้อมูล ECU
                  </p>
                ) : simState.activeDtcCodes.length === 0 ? (
                  <p className="text-xs text-emerald-300 py-2 font-mono">
                    ไม่พบรหัสความผิดปกติค้าง (0 DTCs) · ระบบเครื่องยนต์และเบรกสมบูรณ์
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {simState.activeDtcCodes.map((code) => (
                      <div
                        key={code}
                        className="text-xs font-mono text-amber-300 bg-zinc-950 px-2.5 py-1.5 rounded border border-zinc-800"
                      >
                        {code}
                      </div>
                    ))}
                    <div className="pt-1 flex justify-end">
                      <button
                        type="button"
                        onClick={onClearObdCodes}
                        className="px-3 py-1.5 text-xs font-medium bg-amber-500 text-zinc-950 rounded-md hover:bg-amber-400 transition-colors whitespace-nowrap shrink-0"
                      >
                        ลบโค้ดไฟเตือน ECU (Clear DTC)
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Digital Multimeter & Fluid Telemetry */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-display text-sm font-semibold text-zinc-100">
                    ค่ามิเตอร์ไฟฟ้าและของเหลวเครื่องยนต์
                  </span>
                  <span className="text-xs font-mono text-zinc-400 tabular-nums">
                    น้ำมันเครื่อง {Math.round(simState.oilLevelPercent)}%
                  </span>
                </div>

                {simState.lastMultimeterReading ? (
                  <div className="bg-zinc-950 border border-zinc-800 rounded px-3 py-2 flex items-baseline justify-between">
                    <span className="text-xs text-zinc-300 truncate">
                      {simState.lastMultimeterReading.targetName}
                    </span>
                    <span
                      className={`text-base font-mono font-semibold tabular-nums whitespace-nowrap ${
                        simState.lastMultimeterReading.status === 'fault'
                          ? 'text-red-400'
                          : 'text-emerald-400'
                      }`}
                    >
                      {simState.lastMultimeterReading.value} {simState.lastMultimeterReading.unit}
                    </span>
                  </div>
                ) : (
                  <p className="text-xs text-zinc-400">
                    ใช้ มัลติมิเตอร์ (กดปุ่ม 8) แตะที่แบตเตอรี่หรือคอยล์จุดระเบิดเพื่ออ่านค่าแรงดันและความต้านทานจริง
                  </p>
                )}

                <div className="mt-2 pt-2 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-400 font-mono tabular-nums">
                  <span>
                    แบตเตอรี่: {simState.batteryInstalled ? `${simState.batteryVoltage.toFixed(1)}V` : 'ถอดออก'}
                  </span>
                  <span>·</span>
                  <span>
                    คุณภาพน้ำมัน: {simState.oilQuality === 'good' ? 'สังเคราะห์ใส' : 'ดำเสื่อมสภาพ'}
                  </span>
                  <span>·</span>
                  <span>
                    เครื่องยนต์: {simState.engineRunning ? 'เดินเบา 820 RPM' : 'ดับเครื่อง'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Collapse / Expand Cinema Toggle Button */}
      <button
        type="button"
        onClick={onToggleDock}
        className="pointer-events-auto flex items-center gap-1.5 px-3.5 py-1 text-xs font-medium text-zinc-300 bg-zinc-950/95 border border-b-0 border-zinc-800 rounded-t-lg hover:text-white transition-colors whitespace-nowrap shrink-0"
      >
        {dockCollapsed ? (
          <>
            <ChevronUp className="w-3.5 h-3.5" />
            <span>แสดงแผงอุปกรณ์ช่าง (H)</span>
          </>
        ) : (
          <>
            <ChevronDown className="w-3.5 h-3.5" />
            <span>ซ่อนแผงควบคุม (H)</span>
          </>
        )}
      </button>

      {/* Main Collapsible Bottom Dock */}
      {!dockCollapsed && (
        <div className="w-full bg-zinc-950/95 border border-zinc-800 rounded-2xl p-3 pointer-events-auto shadow-2xl">
          {/* Row 1: Camera Presets · Hydraulic Lift Controls · Quick Workshop Actions */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 mb-2.5 border-b border-zinc-800/90">
            {/* Camera Viewpoint Selector */}
            <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-lg border border-zinc-800/80 overflow-x-auto">
              {(
                [
                  ['vr_fpv', 'มุมมองช่าง VR'],
                  ['engine_bay', 'ห้องเครื่อง'],
                  ['wheel_brake', 'ซุ้มล้อหน้า'],
                  ['underbody', 'ใต้ท้องรถ'],
                  ['orbit_free', 'อิสระ 360°'],
                ] as Array<[CameraPreset, string]>
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => onSelectCamera(id)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    cameraPreset === id
                      ? 'bg-amber-500 text-zinc-950 font-semibold'
                      : 'text-zinc-400 hover:text-zinc-100'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Hydraulic Lift Level Selector */}
            <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-lg border border-zinc-800/80">
              <span className="text-[11px] text-zinc-400 px-1.5 whitespace-nowrap shrink-0">
                ลิฟต์ยกรถ:
              </span>
              {(
                [
                  [0, 'พื้นราบ'],
                  [1, 'ระดับล้อ'],
                  [2, 'สูงสุด'],
                ] as Array<[LiftLevel, string]>
              ).map(([lvl, label]) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => onSelectLift(lvl)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    simState.liftLevel === lvl
                      ? 'bg-zinc-100 text-zinc-950 font-semibold'
                      : 'text-zinc-400 hover:text-zinc-100'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Workshop Utilities: Headlamp, Engine Start, Diagnostics, Checklist, Audio, Reset */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onToggleHeadlamp}
                title="เปิด/ปิดไฟฉายส่องตรวจเช็ก (F)"
                className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                  simState.headlampOn
                    ? 'bg-amber-500/20 border-amber-500/60 text-amber-300'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white'
                }`}
              >
                <Flashlight className="w-3.5 h-3.5" />
                <span>ไฟฉาย</span>
              </button>

              <button
                type="button"
                onClick={onToggleEngine}
                title="สตาร์ท/ดับเครื่องยนต์ทดสอบ (E)"
                className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                  simState.engineRunning
                    ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white'
                }`}
              >
                <Power className="w-3.5 h-3.5" />
                <span>{simState.engineRunning ? 'ดับเครื่อง' : 'สตาร์ท'}</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  onSetTray(activeTray === 'diagnostics' ? 'none' : 'diagnostics')
                }
                className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                  activeTray === 'diagnostics'
                    ? 'bg-zinc-100 border-zinc-100 text-zinc-950'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white'
                }`}
              >
                <ScanLine className="w-3.5 h-3.5" />
                <span>จอวิเคราะห์</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  onSetTray(activeTray === 'checklist' ? 'none' : 'checklist')
                }
                className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 font-mono tabular-nums ${
                  activeTray === 'checklist'
                    ? 'bg-zinc-100 border-zinc-100 text-zinc-950'
                    : allCompleted
                    ? 'bg-emerald-950/60 border-emerald-700 text-emerald-300'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-200 hover:text-white'
                }`}
              >
                <ClipboardCheck className="w-3.5 h-3.5" />
                <span>
                  ใบงาน {completedCount}/{totalSteps}
                </span>
              </button>

              <button
                type="button"
                onClick={onToggleStereoSim}
                title="สลับมุมมองเลนส์คู่ VR Stereoscopic Split-Screen"
                className={`hidden sm:flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                  simState.vrStereoSim
                    ? 'bg-sky-500/20 border-sky-500/60 text-sky-300'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                <Headset className="w-3.5 h-3.5" />
                <span>เลนส์คู่ VR</span>
              </button>

              <button
                type="button"
                onClick={onToggleMuted}
                aria-label={muted ? 'เปิดเสียง' : 'ปิดเสียง'}
                className="p-1.5 text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 rounded-lg transition-colors shrink-0"
              >
                {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              </button>

              <button
                type="button"
                onClick={onResetOrder}
                title="รีเซ็ตใบสั่งซ่อมนี้ใหม่"
                aria-label="รีเซ็ตใบสั่งซ่อม"
                className="p-1.5 text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 rounded-lg transition-colors shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Row 2: 8 Specialized Mechanic Tools Rack */}
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
            {MECHANIC_TOOLS.map((tool) => {
              const selected = tool.id === activeTool;
              return (
                <button
                  key={tool.id}
                  type="button"
                  onClick={() => onSelectTool(tool.id)}
                  className={`group flex flex-col items-start justify-between p-2 rounded-xl border text-left transition-colors ${
                    selected
                      ? 'bg-amber-500 text-zinc-950 border-amber-400 shadow-sm'
                      : 'bg-zinc-900/90 text-zinc-200 border-zinc-800/90 hover:border-zinc-700 hover:bg-zinc-800/80'
                  }`}
                >
                  <div className="w-full flex items-center justify-between gap-1 mb-1">
                    {renderToolIcon(tool.id)}
                    <span
                      className={`text-[10px] font-mono tabular-nums ${
                        selected ? 'text-zinc-900 font-semibold' : 'text-zinc-500'
                      }`}
                    >
                      [{tool.hotkey}]
                    </span>
                  </div>
                  <div className="w-full truncate text-xs font-semibold whitespace-nowrap">
                    {tool.shortNameTh}
                  </div>
                  <div
                    className={`w-full truncate text-[10px] font-mono whitespace-nowrap ${
                      selected ? 'text-zinc-900/80' : 'text-zinc-400'
                    }`}
                  >
                    {tool.specLabel}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Subtle Active Tool Guidance Line */}
          <div className="mt-2 pt-1.5 border-t border-zinc-900 flex flex-wrap items-center justify-between gap-2 text-[11px] text-zinc-400">
            <span className="truncate">
              กำลังถือ: <strong className="text-zinc-200 font-medium">{activeToolSpec.nameTh}</strong> · {activeToolSpec.usageHint}
            </span>
            <span className="hidden md:inline text-zinc-500 whitespace-nowrap shrink-0">
              ลากเมาส์หมุนมุมมอง · ซูมด้วยล้อเมาส์ · เดินรอบอู่ WASD · คลิกชิ้นส่วน 3D เพื่อซ่อม
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

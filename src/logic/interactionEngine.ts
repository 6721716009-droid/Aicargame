import {
  BoltState,
  CarSimState,
  HoveredPartInfo,
  MECHANIC_TOOLS,
  ToolId,
} from '../types/mechanic';
import { soundEngine } from '../audio/soundEngine';

const ENGINE_BAY_PARTS = new Set([
  'vc_bolt_1',
  'vc_bolt_2',
  'vc_bolt_3',
  'vc_bolt_4',
  'valve_cover',
  'coil_0',
  'coil_1',
  'coil_2',
  'coil_3',
  'spark_0',
  'spark_1',
  'spark_2',
  'spark_3',
  'oil_cap',
  'oil_filler_port',
  'dipstick',
  'airbox_bolt_1',
  'airbox_bolt_2',
  'airbox_cover',
  'air_filter',
  'batt_bolt_pos',
  'batt_bolt_neg',
  'battery',
  'obd_port',
]);

// Pick the best context-aware partId from ordered raycast intersections
export function resolveBestHitPartId(
  rawPartIds: string[],
  state: CarSimState,
  activeTool: ToolId
): string | null {
  // Deduplicate preserving ray distance order
  const uniqueIds: string[] = [];
  for (let i = 0; i < rawPartIds.length; i++) {
    const id = rawPartIds[i];
    if (id && !uniqueIds.includes(id)) {
      uniqueIds.push(id);
    }
  }

  // Filter out parts that are physically occluded or inactive right now
  const validIds = uniqueIds.filter((id) => {
    if (id.startsWith('tool_pickup_') || id === 'lift_switch' || id === 'hood') {
      return true;
    }

    // Engine bay parts require hood open
    if (!state.hoodOpen && ENGINE_BAY_PARTS.has(id)) {
      return false;
    }

    // Coils & Spark plugs require Valve Cover removed first
    if (id.startsWith('coil_')) {
      if (state.valveCoverInstalled) return false;
      const idx = Number(id.split('_')[1]);
      // Don't block spark plug access when coil is already removed and player holds spark_puller
      if (!state.coilsInstalled[idx] && activeTool === 'spark_puller') return false;
      // Can only reinstall coil if spark plug is installed
      if (!state.coilsInstalled[idx] && !state.sparkPlugsInstalled[idx]) return false;
      return true;
    }

    if (id.startsWith('spark_')) {
      if (state.valveCoverInstalled) return false;
      const idx = Number(id.split('_')[1]);
      if (state.coilsInstalled[idx]) return false;
      return true;
    }

    if (id === 'valve_cover') {
      if (!state.valveCoverInstalled) {
        // Only show reinstall target when all 4 coils & plugs are back in place and using hand
        return (
          activeTool === 'hand' &&
          state.coilsInstalled.every(Boolean) &&
          state.sparkPlugsInstalled.every(Boolean)
        );
      }
      return true;
    }

    if (id.startsWith('vc_bolt_')) {
      return state.valveCoverInstalled;
    }

    if (id === 'oil_filler_port') {
      return state.valveCoverInstalled && state.oilCapOpen && activeTool === 'oil_kit';
    }

    if (id === 'oil_cap') {
      return state.valveCoverInstalled && activeTool !== 'oil_kit';
    }

    // Airbox hierarchy
    if (id.startsWith('airbox_bolt_')) {
      return state.airboxCoverInstalled;
    }
    if (id === 'air_filter') {
      return !state.airboxCoverInstalled;
    }
    if (id === 'airbox_cover') {
      if (!state.airboxCoverInstalled) {
        return activeTool === 'hand' && state.airFilterInstalled && state.airFilterCondition === 'good';
      }
      return true;
    }

    // Battery hierarchy
    if (id.startsWith('batt_bolt_')) {
      return state.batteryInstalled;
    }

    // Wheel & Brake hierarchy
    if (id.startsWith('lug_')) {
      return state.wheelInstalled;
    }

    if (id === 'wheel_fr') {
      if (!state.wheelInstalled) {
        // Reinstall wheel only when caliper & pads are properly mounted & caliper bolts tightened
        return (
          activeTool === 'hand' &&
          state.caliperInstalled &&
          state.brakePadsInstalled &&
          state.bolts.caliper_bolt_top.tightened &&
          state.bolts.caliper_bolt_bot.tightened
        );
      }
      return true;
    }

    if (id.startsWith('caliper_bolt_')) {
      return !state.wheelInstalled && state.caliperInstalled;
    }

    if (id === 'caliper_fr') {
      if (state.wheelInstalled) return false;
      if (!state.caliperInstalled) {
        return activeTool === 'hand' && state.brakePadsInstalled && state.brakePadsCondition === 'good';
      }
      return true;
    }

    if (id === 'brake_pads_fr') {
      return !state.wheelInstalled && !state.caliperInstalled;
    }

    return true;
  });

  if (validIds.length === 0) return null;

  // Smart priority: bolts & diagnostic ports take precedence over large surrounding covers
  const boltHit = validIds.find(
    (id) =>
      id.includes('bolt') ||
      id.startsWith('lug_') ||
      id === 'oil_drain_plug' ||
      id === 'oil_filler_port' ||
      id === 'oil_cap' ||
      id === 'obd_port' ||
      id === 'dipstick'
  );
  if (boltHit) {
    // Only prioritize bolt over cover if holding a wrench/torque/impact or if bolt is tightened
    const bState = state.bolts[boltHit];
    if (!bState) return boltHit;
    if (activeTool === 'ratchet' || activeTool === 'impact' || activeTool === 'torque') {
      return boltHit;
    }
    if (bState.tightened && activeTool === 'hand') {
      // Let player see either the cover (blocked by bolts) or the bolt itself
      return validIds[0];
    }
    return boltHit;
  }

  return validIds[0];
}

// Inspect hovered part metadata for HUD display
export function getHoveredPartInfo(
  partId: string | null,
  state: CarSimState,
  activeTool: ToolId
): HoveredPartInfo | null {
  if (!partId) return null;

  // 1. Tool Cart Pickup
  if (partId.startsWith('tool_pickup_')) {
    const tId = partId.replace('tool_pickup_', '') as ToolId;
    const spec = MECHANIC_TOOLS.find((t) => t.id === tId);
    if (!spec) return null;
    return {
      partId,
      nameTh: spec.nameTh,
      categoryTh: 'ตู้เครื่องมือช่าง',
      detailText: spec.usageHint,
      requiredToolHint: 'คลิกเพื่อหยิบใช้งานทันที',
      canInteractNow: true,
    };
  }

  // 2. Lift Control Switch
  if (partId === 'lift_switch') {
    const nextLabel =
      state.liftLevel === 0
        ? 'ยกระดับซุ้มล้อ (0.56m)'
        : state.liftLevel === 1
        ? 'ยกสูงสุดเซอร์วิสใต้ท้อง (1.48m)'
        : 'ลดระดับลงพื้นราบ (0.0m)';
    return {
      partId,
      nameTh: 'สวิตช์ควบคุมลิฟต์ไฮดรอลิก 2 เสา',
      categoryTh: 'อุปกรณ์ยกรถ',
      detailText: `ระดับปัจจุบัน: ระดับ ${state.liftLevel} · คลิกเพื่อ${nextLabel}`,
      requiredToolHint: 'คลิกสั่งงานได้ทันที',
      canInteractNow: true,
    };
  }

  // 3. Hinged Hood
  if (partId === 'hood') {
    return {
      partId,
      nameTh: 'ฝากระโปรงหน้ารถยนต์',
      categoryTh: 'ตัวถังภายนอก',
      detailText: state.hoodOpen ? 'สถานะ: เปิดค้ำยันแล้ว' : 'สถานะ: ปิดสนิท',
      requiredToolHint: 'ถุงมือช่าง (1)',
      canInteractNow: activeTool === 'hand',
      blockedReason: activeTool !== 'hand' ? 'สลับเป็น ถุงมือช่าง (กดปุ่ม 1) เพื่อเปิด-ปิดฝากระโปรง' : undefined,
    };
  }

  // 4. Bolts & Lug Nuts
  if (state.bolts[partId]) {
    const b: BoltState = state.bolts[partId];
    const isWheelLug = b.group === 'wheel';
    const isDrainPlug = partId === 'oil_drain_plug';

    let statusText = 'คลายเกลียวแล้ว';
    if (b.tightened) {
      statusText = b.torqued
        ? `ขันตึงตามสเปก (${b.currentNm}/${b.targetNm} Nm)`
        : `ขันยึดเบื้องต้น (${b.currentNm}/${b.targetNm} Nm · รอขันปอนด์)`;
    }

    if (isDrainPlug && state.liftLevel < 2) {
      return {
        partId,
        nameTh: b.nameTh,
        categoryTh: 'ระบบหล่อลื่นใต้ท้องรถ',
        detailText: statusText,
        requiredToolHint: 'ยกลิฟต์ระดับสูงสุด + ประแจบล็อก (2)',
        canInteractNow: false,
        blockedReason: 'ต้องยกลิฟต์ขึ้นระดับสูงสุด (ใต้ท้องรถ) ก่อนขันน็อตถ่ายน้ำมันเครื่อง',
        boltData: b,
      };
    }

    if (isWheelLug) {
      const okImpact = activeTool === 'impact';
      const okTorque = activeTool === 'torque' && b.tightened && !b.torqued;
      return {
        partId,
        nameTh: b.nameTh,
        categoryTh: 'ระบบล้อและช่วงล่าง',
        detailText: statusText,
        requiredToolHint: b.tightened && !b.torqued ? 'ประแจปอนด์ (4) ค้างไว้ที่ 110 Nm' : 'บล็อกลม (3)',
        canInteractNow: okImpact || okTorque,
        blockedReason:
          !okImpact && !okTorque
            ? b.tightened && !b.torqued
              ? 'ใช้ ประแจปอนด์ (4) คลิกค้างเพื่ออัดแรงบิด 110 Nm หรือใช้ บล็อกลม (3) ยิงคลายออก'
              : 'ใช้ บล็อกลมกระแทก (3) สำหรับน็อตล้อ 19mm'
            : undefined,
        boltData: b,
      };
    }

    const okRatchet = activeTool === 'ratchet';
    const okTorque = activeTool === 'torque' && b.tightened && !b.torqued;
    return {
      partId,
      nameTh: b.nameTh,
      categoryTh: `สลักเกลียว ${b.sizeMm}mm`,
      detailText: statusText,
      requiredToolHint:
        b.tightened && !b.torqued
          ? `ประแจปอนด์ (4) เป้าหมาย ${b.targetNm} Nm`
          : `ประแจบล็อก (2) ขนาด ${b.sizeMm}mm`,
      canInteractNow: okRatchet || okTorque,
      blockedReason:
        !okRatchet && !okTorque
          ? b.tightened && !b.torqued
            ? `สลับเป็น ประแจปอนด์ (4) คลิกค้างเพื่อขันตึง ${b.targetNm} Nm หรือใช้ ประแจบล็อก (2) คลายออก`
            : `สลับเป็น ประแจบล็อกก๊อกแก๊ก (2) เพื่อขันสกรู ${b.sizeMm}mm`
          : undefined,
      boltData: b,
    };
  }

  // 5. Valve Cover
  if (partId === 'valve_cover') {
    const boltsLoose = ['vc_bolt_1', 'vc_bolt_2', 'vc_bolt_3', 'vc_bolt_4'].every(
      (id) => !state.bolts[id].tightened
    );
    if (state.valveCoverInstalled) {
      return {
        partId,
        nameTh: 'ฝาครอบวาล์วเครื่องยนต์ DOHC',
        categoryTh: 'ฝาสูบเครื่องยนต์',
        detailText: boltsLoose ? 'น็อตคลายครบ 4 ตัว พร้อมยกถอด' : 'ยึดด้วยน็อต 10mm จำนวน 4 ตัว',
        requiredToolHint: 'ถุงมือช่าง (1)',
        canInteractNow: activeTool === 'hand' && boltsLoose,
        blockedReason: !boltsLoose
          ? 'ต้องใช้ ประแจบล็อก (2) คลายน็อตฝาครอบวาล์วทั้ง 4 ตัวออกก่อน'
          : activeTool !== 'hand'
          ? 'สลับเป็น ถุงมือช่าง (1) เพื่อยกฝาครอบวาล์วออก'
          : undefined,
      };
    }
    return {
      partId,
      nameTh: 'ตำแหน่งประกอบฝาครอบวาล์ว DOHC',
      categoryTh: 'ฝาสูบเครื่องยนต์',
      detailText: 'คอยล์และหัวเทียนติดตั้งครบทั้ง 4 สูบแล้ว',
      requiredToolHint: 'ถุงมือช่าง (1) เพื่อวางฝาครอบวาล์วกลับ',
      canInteractNow: activeTool === 'hand',
    };
  }

  // 6. Ignition Coils (0..3)
  if (partId.startsWith('coil_')) {
    const idx = Number(partId.split('_')[1]);
    const cylNo = idx + 1;
    const installed = state.coilsInstalled[idx];

    if (activeTool === 'multimeter' && installed) {
      return {
        partId,
        nameTh: `คอยล์จุดระเบิดสูบที่ ${cylNo}`,
        categoryTh: 'ระบบจุดระเบิด',
        detailText: 'พร้อมวัดค่าความต้านทานขดลวดปฐมภูมิ (Ω)',
        requiredToolHint: 'คลิกเพื่อวัดค่าด้วยมัลติมิเตอร์',
        canInteractNow: true,
      };
    }

    return {
      partId,
      nameTh: installed ? `คอยล์จุดระเบิดสูบที่ ${cylNo}` : `เบ้าเสียบคอยล์จุดระเบิดสูบที่ ${cylNo}`,
      categoryTh: 'ระบบจุดระเบิด',
      detailText: installed ? 'สถานะ: เสียบล็อกอยู่ในเบ้าสูบ' : 'สถานะ: ถอดออกแล้ว · คลิกเพื่อเสียบคอยล์กลับ',
      requiredToolHint: 'ถุงมือช่าง (1)',
      canInteractNow: activeTool === 'hand',
      blockedReason: activeTool !== 'hand' ? 'สลับเป็น ถุงมือช่าง (1) หรือ มัลติมิเตอร์ (8)' : undefined,
    };
  }

  // 7. Spark Plugs (0..3)
  if (partId.startsWith('spark_')) {
    const idx = Number(partId.split('_')[1]);
    const cylNo = idx + 1;
    const installed = state.sparkPlugsInstalled[idx];
    const cond = state.sparkPlugConditions[idx];
    return {
      partId,
      nameTh: installed ? `หัวเทียนสูบที่ ${cylNo}` : `เบ้าเกลียวหัวเทียนสูบที่ ${cylNo}`,
      categoryTh: 'ระบบจุดระเบิด',
      detailText: !installed
        ? 'เบ้าว่าง · พร้อมใส่หัวเทียนอิริเดียมตัวใหม่'
        : cond === 'good'
        ? 'สภาพ: หัวเทียนอิริเดียมใหม่ สะอาดพร้อมใช้งาน'
        : 'สภาพ: เขม่าดำเกาะหนา เสื่อมสภาพ (ต้นเหตุเครื่องเดินสะดุด!)',
      requiredToolHint: 'บล็อกถอดหัวเทียนแม่เหล็ก (5)',
      canInteractNow: activeTool === 'spark_puller',
      blockedReason:
        activeTool !== 'spark_puller'
          ? 'สลับเป็น บล็อกถอดหัวเทียนแม่เหล็ก (กดปุ่ม 5) เพื่อถอด-ใส่หัวเทียนในเบ้าลึก'
          : undefined,
    };
  }

  // 8. Oil Filler Cap, Port & Dipstick
  if (partId === 'oil_cap') {
    return {
      partId,
      nameTh: 'ฝาเติมน้ำมันเครื่องด้านบน (5W-30)',
      categoryTh: 'ระบบหล่อลื่น',
      detailText: state.oilCapOpen ? 'สถานะ: เปิดฝาอยู่' : 'สถานะ: ปิดล็อกสนิท',
      requiredToolHint: 'ถุงมือช่าง (1)',
      canInteractNow: activeTool === 'hand',
      blockedReason: activeTool !== 'hand' ? 'ใช้ ถุงมือช่าง (1) หมุนเปิด-ปิดฝาเติมน้ำมันเครื่อง' : undefined,
    };
  }

  if (partId === 'oil_filler_port') {
    const drainClosed = state.bolts.oil_drain_plug.tightened;
    return {
      partId,
      nameTh: 'ช่องเติมน้ำมันเครื่องสังเคราะห์ 5W-30',
      categoryTh: 'ระบบหล่อลื่น',
      detailText: `ระดับน้ำมันปัจจุบัน: ${Math.round(state.oilLevelPercent)}% · คุณภาพ: ${
        state.oilQuality === 'good' ? 'ใสสะอาด' : 'เก่าดำเสื่อมสภาพ'
      }`,
      requiredToolHint: 'ชุดเติมน้ำมัน (6)',
      canInteractNow: activeTool === 'oil_kit' && drainClosed && state.oilFilterInstalled,
      blockedReason: !drainClosed
        ? 'ต้องขันปิดน็อตถ่ายน้ำมันเครื่องใต้ท้องอ่างก่อนเติมน้ำมันใหม่!'
        : !state.oilFilterInstalled
        ? 'ต้องติดตั้งกรองน้ำมันเครื่องใต้ท้องรถก่อนเติมน้ำมัน!'
        : undefined,
    };
  }

  if (partId === 'dipstick') {
    return {
      partId,
      nameTh: 'ก้านวัดระดับน้ำมันเครื่อง (Dipstick)',
      categoryTh: 'ตรวจสอบของเหลว',
      detailText: `ระดับวัดได้: ${Math.round(state.oilLevelPercent)}% (${
        state.oilLevelPercent < 30 ? 'ต่ำกว่าขีด MIN!' : state.oilLevelPercent >= 80 ? 'ระดับ FULL พอดี' : 'ระดับปานกลาง'
      }) · สีน้ำมัน: ${state.oilQuality === 'good' ? 'ทองใส (สังเคราะห์ใหม่)' : 'ดำข้น (ควรเปลี่ยนถ่าย)'}`,
      requiredToolHint: 'ตรวจสอบด้วยสายตา / คลิกเช็กระดับ',
      canInteractNow: true,
    };
  }

  // 9. Underbody Oil Filter
  if (partId === 'oil_filter') {
    if (state.liftLevel < 2) {
      return {
        partId,
        nameTh: 'กรองน้ำมันเครื่อง (Spin-On Oil Filter)',
        categoryTh: 'ระบบหล่อลื่นใต้ท้องรถ',
        detailText: 'อยู่ใต้ท้องเครื่องยนต์',
        requiredToolHint: 'ยกลิฟต์ระดับสูงสุด + ถุงมือช่าง (1)',
        canInteractNow: false,
        blockedReason: 'ยกลิฟต์ขึ้นระดับสูงสุด (ใต้ท้องรถ) ก่อนถอดเปลี่ยนกรองน้ำมันเครื่อง',
      };
    }
    return {
      partId,
      nameTh: state.oilFilterInstalled ? 'กรองน้ำมันเครื่อง' : 'แป้นเกลียวใส่กรองน้ำมันเครื่อง',
      categoryTh: 'ระบบหล่อลื่นใต้ท้องรถ',
      detailText: !state.oilFilterInstalled
        ? 'ถอดลูกเก่าออกแล้ว · คลิกเพื่อหมุนใส่กรองน้ำมันเครื่องลูกใหม่'
        : state.oilFilterCondition === 'good'
        ? 'สภาพ: กรองลูกใหม่สะอาด'
        : 'สภาพ: กรองเก่าตันและมีคราบน้ำมันดำ',
      requiredToolHint: 'ถุงมือช่าง (1)',
      canInteractNow: activeTool === 'hand',
      blockedReason: activeTool !== 'hand' ? 'ใช้ ถุงมือช่าง (1) หมุนถอด-ใส่กรองน้ำมันเครื่อง' : undefined,
    };
  }

  // 10. Airbox Cover & Air Filter
  if (partId === 'airbox_cover') {
    const screwsLoose = !state.bolts.airbox_bolt_1.tightened && !state.bolts.airbox_bolt_2.tightened;
    if (state.airboxCoverInstalled) {
      return {
        partId,
        nameTh: 'ฝาครอบหม้อกรองอากาศ',
        categoryTh: 'ระบบไอดี',
        detailText: screwsLoose ? 'คลายสกรูครบแล้ว พร้อมยกเปิดฝา' : 'ยึดด้วยสกรู 10mm จำนวน 2 ตัว',
        requiredToolHint: 'ถุงมือช่าง (1)',
        canInteractNow: activeTool === 'hand' && screwsLoose,
        blockedReason: !screwsLoose
          ? 'ใช้ ประแจบล็อก (2) คลายสกรูหม้อกรองอากาศทั้ง 2 ตัวก่อน'
          : activeTool !== 'hand'
          ? 'สลับเป็น ถุงมือช่าง (1) เพื่อเปิดฝาหม้อกรอง'
          : undefined,
      };
    }
    return {
      partId,
      nameTh: 'ปิดฝาครอบหม้อกรองอากาศกลับ',
      categoryTh: 'ระบบไอดี',
      detailText: 'ไส้กรองอากาศใหม่อยู่ในตำแหน่งเรียบร้อย',
      requiredToolHint: 'ถุงมือช่าง (1)',
      canInteractNow: activeTool === 'hand',
    };
  }

  if (partId === 'air_filter') {
    return {
      partId,
      nameTh: state.airFilterInstalled ? 'แผ่นไส้กรองอากาศเครื่องยนต์' : 'ช่องวางไส้กรองอากาศ',
      categoryTh: 'ระบบไอดี',
      detailText: !state.airFilterInstalled
        ? 'ช่องว่าง · คลิกเพื่อใส่แผ่นไส้กรองอากาศใหม่'
        : state.airFilterCondition === 'good'
        ? 'สภาพ: ไส้กรองใหม่สะอาด อากาศไหลสะดวก'
        : 'สภาพ: ฝุ่นเขม่าอุดตันหนา (ควรเปลี่ยนใหม่)',
      requiredToolHint: 'ถุงมือช่าง (1)',
      canInteractNow: activeTool === 'hand',
      blockedReason: activeTool !== 'hand' ? 'ใช้ ถุงมือช่าง (1) หยิบเปลี่ยนแผ่นไส้กรองอากาศ' : undefined,
    };
  }

  // 11. Battery
  if (partId === 'battery') {
    if (activeTool === 'multimeter' && state.batteryInstalled) {
      return {
        partId,
        nameTh: 'แบตเตอรี่รถยนต์ 12V AGM',
        categoryTh: 'ระบบไฟฟ้า',
        detailText: 'พร้อมวัดแรงดันไฟตรงขั้วบวก-ลบ (DC Voltage)',
        requiredToolHint: 'คลิกเพื่อจี้สายวัดมัลติมิเตอร์',
        canInteractNow: true,
      };
    }

    const clampsLoose = !state.bolts.batt_bolt_pos.tightened && !state.bolts.batt_bolt_neg.tightened;
    if (state.batteryInstalled) {
      return {
        partId,
        nameTh: 'แบตเตอรี่รถยนต์ 12V AGM',
        categoryTh: 'ระบบไฟฟ้า',
        detailText:
          state.batteryCondition === 'good'
            ? `สภาพสมบูรณ์ (${state.batteryVoltage.toFixed(1)}V)`
            : `แบตเสื่อมแรงดันตก (${state.batteryVoltage.toFixed(1)}V)`,
        requiredToolHint: 'มัลติมิเตอร์ (8) วัดไฟ · ถุงมือ (1) ยกเปลี่ยน',
        canInteractNow: activeTool === 'hand' && clampsLoose,
        blockedReason: !clampsLoose
          ? 'ต้องใช้ ประแจบล็อก (2) คลายน็อตประกับขั้วบวก (+) และลบ (-) ออกก่อนยกแบตเตอรี่'
          : activeTool !== 'hand'
          ? 'สลับเป็น ถุงมือช่าง (1) เพื่อยกแบตเตอรี่ หรือ มัลติมิเตอร์ (8) เพื่อวัดโวลต์'
          : undefined,
      };
    }
    return {
      partId,
      nameTh: 'ถาดวางแบตเตอรี่รถยนต์',
      categoryTh: 'ระบบไฟฟ้า',
      detailText: 'ถาดว่าง · คลิกเพื่อยกแบตเตอรี่ลูกใหม่ (12.7V) ลงติดตั้ง',
      requiredToolHint: 'ถุงมือช่าง (1)',
      canInteractNow: activeTool === 'hand',
    };
  }

  // 12. OBD-II Port
  if (partId === 'obd_port') {
    return {
      partId,
      nameTh: 'พอร์ตวิเคราะห์ระบบ ECU OBD-II',
      categoryTh: 'กล่องควบคุมเครื่องยนต์',
      detailText: state.obdConnected
        ? `เชื่อมต่อแล้ว · พบรหัสค้าง ${state.activeDtcCodes.length} รายการ`
        : 'ยังไม่ได้เสียบสายสแกน CAN-BUS',
      requiredToolHint: 'เครื่องสแกน OBD-II (7)',
      canInteractNow: activeTool === 'obd',
      blockedReason:
        activeTool !== 'obd' ? 'สลับเป็น เครื่องสแกน OBD-II (กดปุ่ม 7) เพื่อเชื่อมต่อพอร์ต ECU' : undefined,
    };
  }

  // 13. Front-Right Wheel, Caliper & Brake Pads
  if (partId === 'wheel_fr') {
    const lugsLoose = ['lug_1', 'lug_2', 'lug_3', 'lug_4', 'lug_5'].every(
      (id) => !state.bolts[id].tightened
    );
    if (state.wheelInstalled) {
      const lifted = state.liftLevel >= 1;
      return {
        partId,
        nameTh: 'ล้อแม็กหน้าขวา 18 นิ้ว (5 ก้าน)',
        categoryTh: 'ระบบล้อและเบรก',
        detailText: lugsLoose ? 'คลายน็อตล้อครบ 5 ตัวแล้ว พร้อมยกถอด' : 'ยึดด้วยน็อตล้อ 19mm จำนวน 5 ตัว',
        requiredToolHint: 'ยกลิฟต์ + บล็อกลม (3) + ถุงมือ (1)',
        canInteractNow: activeTool === 'hand' && lugsLoose && lifted,
        blockedReason: !lifted
          ? 'ต้องยกลิฟต์ขึ้นอย่างน้อย ระดับซุ้มล้อ ก่อนถอดล้อรถ!'
          : !lugsLoose
          ? 'ต้องใช้ บล็อกลมกระแทก (3) ยิงคลายน็อตล้อทั้ง 5 ตัวออกก่อน'
          : activeTool !== 'hand'
          ? 'สลับเป็น ถุงมือช่าง (1) เพื่อยกล้อออกจากดุม'
          : undefined,
      };
    }
    return {
      partId,
      nameTh: 'ดุมล้อหน้าขวา (พร้อมใส่ล้อแม็กกลับ)',
      categoryTh: 'ระบบล้อและเบรก',
      detailText: 'คาลิปเปอร์และผ้าเบรกติดตั้งเรียบร้อยแล้ว',
      requiredToolHint: 'ถุงมือช่าง (1) เพื่อยกล้อแม็กใส่กลับ',
      canInteractNow: activeTool === 'hand',
    };
  }

  if (partId === 'caliper_fr') {
    const boltsLoose =
      !state.bolts.caliper_bolt_top.tightened && !state.bolts.caliper_bolt_bot.tightened;
    if (state.caliperInstalled) {
      return {
        partId,
        nameTh: 'คาลิปเปอร์เบรกหน้าขวา 4 พอต',
        categoryTh: 'ระบบดิสก์เบรก',
        detailText: boltsLoose ? 'คลายน็อตสลักครบ 2 ตัว พร้อมถอดออก' : 'ยึดด้วยน็อตสลัก 14mm ด้านหลัง 2 ตัว',
        requiredToolHint: 'ประแจบล็อก (2) + ถุงมือช่าง (1)',
        canInteractNow: activeTool === 'hand' && boltsLoose,
        blockedReason: !boltsLoose
          ? 'ใช้ ประแจบล็อก (2) คลายน็อตสลักคาลิปเปอร์ 14mm ทั้งบนและล่างก่อน'
          : activeTool !== 'hand'
          ? 'สลับเป็น ถุงมือช่าง (1) เพื่อถอดคาลิปเปอร์เบรก'
          : undefined,
      };
    }
    return {
      partId,
      nameTh: 'จุดยึดคาลิปเปอร์เบรกหน้าขวา',
      categoryTh: 'ระบบดิสก์เบรก',
      detailText: 'ผ้าเบรกเซรามิกชุดใหม่อยู่ในร่องจานดิสก์แล้ว',
      requiredToolHint: 'ถุงมือช่าง (1) เพื่อสวมคาลิปเปอร์กลับ',
      canInteractNow: activeTool === 'hand',
    };
  }

  if (partId === 'brake_pads_fr') {
    return {
      partId,
      nameTh: state.brakePadsInstalled ? 'ชุดผ้าเบรกหน้าขวา' : 'ร่องยึดผ้าเบรกจานดิสก์',
      categoryTh: 'ระบบดิสก์เบรก',
      detailText: !state.brakePadsInstalled
        ? 'ถอดผ้าเบรกเก่าออกแล้ว · คลิกเพื่อใส่ผ้าเบรกเซรามิกชุดใหม่'
        : state.brakePadsCondition === 'good'
        ? 'สภาพ: ผ้าเบรกเซรามิกใหม่ หนาเต็มพิกัด 11mm'
        : 'สภาพ: ผ้าเบรกสึกบางเฉียบและไหม้ (< 2mm) ต้องเปลี่ยนใหม่!',
      requiredToolHint: 'ถุงมือช่าง (1)',
      canInteractNow: activeTool === 'hand',
      blockedReason: activeTool !== 'hand' ? 'ใช้ ถุงมือช่าง (1) ถอดและใส่ผ้าเบรก' : undefined,
    };
  }

  return null;
}

export interface InteractionResult {
  nextState: CarSimState;
  toastMessage: string;
  toastType: 'success' | 'info' | 'warning';
  switchedTool?: ToolId;
   pouredOil?: boolean;
}

// Execute primary click / VR trigger action on a 3D part
export function executePartInteraction(
  partId: string,
  state: CarSimState,
  activeTool: ToolId
): InteractionResult | null {
  // 1. Tool Pickup on 3D Cart
  if (partId.startsWith('tool_pickup_')) {
    const newTool = partId.replace('tool_pickup_', '') as ToolId;
    const spec = MECHANIC_TOOLS.find((t) => t.id === newTool);
    soundEngine.playPartClunk(false);
    return {
      nextState: state,
      switchedTool: newTool,
      toastMessage: `หยิบอุปกรณ์: ${spec?.shortNameTh ?? newTool}`,
      toastType: 'info',
    };
  }

  // 2. Lift Control Switch
  if (partId === 'lift_switch') {
    const nextLift = ((state.liftLevel + 1) % 3) as 0 | 1 | 2;
    soundEngine.playLiftMotor();
    const names = ['พื้นราบ (0.0m)', 'ระดับซุ้มล้อและเบรก (0.56m)', 'สูงสุดเซอร์วิสใต้ท้องรถ (1.48m)'];
    return {
      nextState: { ...state, liftLevel: nextLift },
      toastMessage: `ปรับลิฟต์ไฮดรอลิกไปที่: ${names[nextLift]}`,
      toastType: 'info',
    };
  }

  const info = getHoveredPartInfo(partId, state, activeTool);
  if (!info) return null;

  if (!info.canInteractNow) {
    soundEngine.playDiagnosticChime(true);
    return {
      nextState: state,
      toastMessage: info.blockedReason || `ต้องใช้อุปกรณ์: ${info.requiredToolHint}`,
      toastType: 'warning',
    };
  }

  // 3. Hood Open/Close
  if (partId === 'hood') {
    const opening = !state.hoodOpen;
    soundEngine.playPartClunk(true);
    return {
      nextState: { ...state, hoodOpen: opening },
      toastMessage: opening ? 'เปิดฝากระโปรงหน้ารถและค้ำเหล็กยึดแล้ว' : 'ปิดฝากระโปรงหน้ารถเรียบร้อย',
      toastType: 'info',
    };
  }

  // 4. Bolts & Lug Nuts (Ratchet / Impact) — Note: Torque Wrench hold is handled continuously, single click gives helpful hint if not yet torqued
  if (state.bolts[partId]) {
    const b = state.bolts[partId];

    if (activeTool === 'torque') {
      // Single quick tap with torque wrench advances +25% toward spec so both click & hold feel great!
      const stepNm = Math.max(4, Math.round(b.targetNm * 0.34));
      const nextNm = Math.min(b.targetNm, b.currentNm + stepNm);
      const reached = nextNm >= b.targetNm;
      soundEngine.playTorqueBeep(reached);
      const updatedBolt: BoltState = {
        ...b,
        currentNm: nextNm,
        torqued: reached,
      };
      return {
        nextState: {
          ...state,
          bolts: { ...state.bolts, [partId]: updatedBolt },
        },
        toastMessage: reached
          ? `ขันปอนด์ ${b.nameTh} ได้ค่ามาตรฐาน ${b.targetNm} Nm พอดี!`
          : `กำลังเพิ่มแรงบิด ${b.nameTh}: ${nextNm}/${b.targetNm} Nm (คลิกซ้ำหรือกดค้างจนถึงสเปก)`,
        toastType: reached ? 'success' : 'info',
      };
    }

    const willTighten = !b.tightened;
    if (b.group === 'wheel') {
      soundEngine.playImpactWrench();
    } else {
      soundEngine.playRatchetClick();
    }

    const initialSnugNm = willTighten ? Math.round(b.targetNm * 0.45) : 0;
    const nextBolts = {
      ...state.bolts,
      [partId]: {
        ...b,
        tightened: willTighten,
        torqued: false,
        currentNm: initialSnugNm,
      },
    };

    // Special physics: opening oil drain plug starts draining old oil!
    if (partId === 'oil_drain_plug') {
      if (!willTighten && state.oilLevelPercent > 0) {
        soundEngine.playFluidPour();
        return {
          nextState: {
            ...state,
            bolts: nextBolts,
            oilDraining: true,
            engineRunning: false,
          },
          toastMessage: 'คลายน็อตอ่างน้ำมัน 17mm แล้ว — กำลังถ่ายน้ำมันเครื่องเก่าลงถังรองรับ...',
          toastType: 'info',
        };
      }
      return {
        nextState: {
          ...state,
          bolts: nextBolts,
          oilDraining: false,
        },
        toastMessage: willTighten
          ? 'ขันยึดน็อตอ่างน้ำมันแล้ว (แนะนำใช้ประแจปอนด์ขันตึงที่ 40 Nm)'
          : 'ถอดน็อตถ่ายน้ำมันเครื่องแล้ว',
        toastType: 'info',
      };
    }

    return {
      nextState: {
        ...state,
        bolts: nextBolts,
      },
      toastMessage: willTighten
        ? `ขันยึด ${b.nameTh} เบื้องต้นแล้ว (${initialSnugNm} Nm · ใช้ประแจปอนด์ย้ำที่ ${b.targetNm} Nm)`
        : `คลายเกลียว ${b.nameTh} ออกเรียบร้อย`,
      toastType: 'info',
    };
  }

  // 5. Valve Cover
  if (partId === 'valve_cover') {
    const installing = !state.valveCoverInstalled;
    soundEngine.playPartClunk(true);
    return {
      nextState: { ...state, valveCoverInstalled: installing },
      toastMessage: installing
        ? 'วางฝาครอบวาล์ว DOHC กลับเข้าที่แล้ว — อย่าลืมขันน็อต 10mm ทั้ง 4 ตัวและวัดปอนด์ 25 Nm'
        : 'ยกถอดฝาครอบวาล์วออกแล้ว — เข้าถึงคอยล์จุดระเบิดทั้ง 4 สูบได้',
      toastType: 'info',
    };
  }

  // 6. Ignition Coils
  if (partId.startsWith('coil_')) {
    const idx = Number(partId.split('_')[1]);
    if (activeTool === 'multimeter') {
      soundEngine.playDiagnosticChime(false);
      const spBad = state.sparkPlugConditions[idx] !== 'good';
      return {
        nextState: {
          ...state,
          lastMultimeterReading: {
            targetName: `คอยล์จุดระเบิดสูบที่ ${idx + 1}`,
            value: '0.82',
            unit: 'Ω (ขดลวดปกติ)',
            status: 'normal',
          },
        },
        toastMessage: spBad
          ? `คอยล์สูบ ${idx + 1} ปกติ (0.82 Ω) — แนะนำถอดคอยล์ออกเพื่อตรวจเช็กสภาพหัวเทียนด้านล่าง!`
          : `คอยล์จุดระเบิดสูบ ${idx + 1} ค่าความต้านทาน 0.82 Ω ปกติสมบูรณ์`,
        toastType: 'info',
      };
    }

    const nextCoils = [...state.coilsInstalled] as [boolean, boolean, boolean, boolean];
    nextCoils[idx] = !nextCoils[idx];
    soundEngine.playPartClunk(false);
    return {
      nextState: { ...state, coilsInstalled: nextCoils },
      toastMessage: nextCoils[idx]
        ? `เสียบล็อกคอยล์จุดระเบิดสูบที่ ${idx + 1} เรียบร้อย`
        : `ดึงถอดคอยล์จุดระเบิดสูบที่ ${idx + 1} ออกแล้ว`,
      toastType: 'info',
    };
  }

  // 7. Spark Plugs
  if (partId.startsWith('spark_')) {
    const idx = Number(partId.split('_')[1]);
    const nextInstalled = [...state.sparkPlugsInstalled] as [boolean, boolean, boolean, boolean];
    const nextConds = [...state.sparkPlugConditions] as typeof state.sparkPlugConditions;

    if (nextInstalled[idx]) {
      nextInstalled[idx] = false;
      soundEngine.playRatchetClick();
      return {
        nextState: { ...state, sparkPlugsInstalled: nextInstalled },
        toastMessage: `ดึงหัวเทียนเก่าออกจากสูบที่ ${idx + 1} แล้ว · คลิกซ้ำเพื่อใส่หัวเทียนอิริเดียมตัวใหม่`,
        toastType: 'info',
      };
    } else {
      nextInstalled[idx] = true;
      nextConds[idx] = 'good';
      soundEngine.playRatchetClick();
      // Auto-update misfire code readiness (cleared via OBD-II scanner)
      return {
        nextState: {
          ...state,
          sparkPlugsInstalled: nextInstalled,
          sparkPlugConditions: nextConds,
        },
        toastMessage: `ติดตั้งหัวเทียนอิริเดียมใหม่ลงสูบที่ ${idx + 1} แน่นสนิท!`,
        toastType: 'success',
      };
    }
  }

  // 8. Oil Cap, Pouring & Dipstick
  if (partId === 'oil_cap') {
    const nextOpen = !state.oilCapOpen;
    soundEngine.playPartClunk(false);
    return {
      nextState: { ...state, oilCapOpen: nextOpen },
      toastMessage: nextOpen
        ? 'หมุนเปิดฝาเติมน้ำมันเครื่องด้านบนแล้ว'
        : 'หมุนปิดล็อกฝาเติมน้ำมันเครื่องสนิทแล้ว',
      toastType: 'info',
    };
  }

  if (partId === 'oil_filler_port') {
    if (state.oilLevelPercent >= 100 && state.oilQuality === 'good') {
      return {
        nextState: state,
        toastMessage: 'ระดับน้ำมันเครื่องสังเคราะห์ 5W-30 เต็มขีด MAX (100%) พอดีแล้ว!',
        toastType: 'success',
      };
    }
    const nextLevel = Math.min(100, state.oilLevelPercent + 34);
    soundEngine.playFluidPour();
    return {
      nextState: {
        ...state,
        oilLevelPercent: nextLevel,
        oilQuality: state.oilLevelPercent <= 5 ? 'good' : state.oilQuality === 'degraded' ? 'good' : 'good',
      },
      pouredOil: true,
      toastMessage: `เติมน้ำมันสังเคราะห์แท้ 5W-30 แล้ว · ระดับปัจจุบัน ${Math.round(nextLevel)}%`,
      toastType: nextLevel >= 85 ? 'success' : 'info',
    };
  }

  if (partId === 'dipstick') {
    soundEngine.playPartClunk(false);
    return {
      nextState: state,
      toastMessage: `เช็กก้านวัดน้ำมันเครื่อง: ระดับ ${Math.round(state.oilLevelPercent)}% · สภาพ${
        state.oilQuality === 'good' ? 'ทองใสสะอาด' : 'ดำข้นเสื่อมสภาพ'
      }`,
      toastType: state.oilQuality === 'good' && state.oilLevelPercent >= 80 ? 'success' : 'info',
    };
  }

  // 9. Underbody Oil Filter
  if (partId === 'oil_filter') {
    soundEngine.playPartClunk(false);
    if (state.oilFilterInstalled) {
      return {
        nextState: { ...state, oilFilterInstalled: false },
        toastMessage: 'หมุนถอดกรองน้ำมันเครื่องลูกเก่าออกแล้ว · คลิกซ้ำเพื่อใส่กรองลูกใหม่',
        toastType: 'info',
      };
    }
    return {
      nextState: {
        ...state,
        oilFilterInstalled: true,
        oilFilterCondition: 'good',
      },
      toastMessage: 'หมุนติดตั้งกรองน้ำมันเครื่องลูกใหม่พร้อมทาซีลยางเรียบร้อย!',
      toastType: 'success',
    };
  }

  // 10. Airbox & Air Filter
  if (partId === 'airbox_cover') {
    const installing = !state.airboxCoverInstalled;
    soundEngine.playPartClunk(false);
    return {
      nextState: { ...state, airboxCoverInstalled: installing },
      toastMessage: installing
        ? 'ปิดฝาครอบหม้อกรองอากาศแล้ว — อย่าลืมขันสกรูยึด 10mm ทั้ง 2 ตัว'
        : 'เปิดฝาครอบหม้อกรองอากาศออกแล้ว',
      toastType: 'info',
    };
  }

  if (partId === 'air_filter') {
    soundEngine.playPartClunk(false);
    if (state.airFilterInstalled) {
      return {
        nextState: { ...state, airFilterInstalled: false },
        toastMessage: 'หยิบแผ่นไส้กรองอากาศเก่าออกแล้ว · คลิกซ้ำเพื่อวางไส้กรองใหม่',
        toastType: 'info',
      };
    }
    return {
      nextState: {
        ...state,
        airFilterInstalled: true,
        airFilterCondition: 'good',
      },
      toastMessage: 'ใส่แผ่นไส้กรองอากาศใหม่สะอาดเข้ารูปหม้อกรองแล้ว!',
      toastType: 'success',
    };
  }

  // 11. Battery
  if (partId === 'battery') {
    if (activeTool === 'multimeter') {
      const isWeak = state.batteryCondition !== 'good';
      soundEngine.playDiagnosticChime(isWeak);
      return {
        nextState: {
          ...state,
          lastMultimeterReading: {
            targetName: 'ขั้วแบตเตอรี่รถยนต์ 12V',
            value: state.batteryVoltage.toFixed(2),
            unit: 'V DC',
            status: isWeak ? 'fault' : 'normal',
          },
        },
        toastMessage: isWeak
          ? `วัดแรงดันแบตเตอรี่ได้ ${state.batteryVoltage.toFixed(2)}V (ต่ำกว่าเกณฑ์ 12.4V — ควรเปลี่ยนลูกใหม่!)`
          : `วัดแรงดันแบตเตอรี่ได้ ${state.batteryVoltage.toFixed(2)}V ไฟเต็มสมบูรณ์!`,
        toastType: isWeak ? 'warning' : 'success',
      };
    }

    soundEngine.playPartClunk(true);
    if (state.batteryInstalled) {
      return {
        nextState: { ...state, batteryInstalled: false, engineRunning: false },
        toastMessage: 'ยกแบตเตอรี่ลูกเก่าออกจากถาดแล้ว · คลิกซ้ำเพื่อยกแบตเตอรี่ AGM ลูกใหม่ลงติดตั้ง',
        toastType: 'info',
      };
    }
    return {
      nextState: {
        ...state,
        batteryInstalled: true,
        batteryCondition: 'good',
        batteryVoltage: 12.7,
      },
      toastMessage: 'ติดตั้งแบตเตอรี่ AGM ลูกใหม่ (12.7V) แล้ว — อย่าลืมขันน็อตประกับขั้วบวก-ลบ!',
      toastType: 'success',
    };
  }

  // 12. OBD-II Port
  if (partId === 'obd_port') {
    soundEngine.playDiagnosticChime(state.activeDtcCodes.length > 0);
    return {
      nextState: { ...state, obdConnected: true },
      toastMessage:
        state.activeDtcCodes.length > 0
          ? `เชื่อมต่อ ECU สำเร็จ · พบรหัสปัญหา ${state.activeDtcCodes.length} รายการบนหน้าจอสแกน`
          : 'เชื่อมต่อ ECU สำเร็จ · ระบบปกติ ไม่พบรหัสความผิดปกติค้าง',
      toastType: state.activeDtcCodes.length > 0 ? 'warning' : 'success',
    };
  }

  // 13. Wheel, Caliper & Brake Pads
  if (partId === 'wheel_fr') {
    const installing = !state.wheelInstalled;
    soundEngine.playPartClunk(true);
    return {
      nextState: { ...state, wheelInstalled: installing },
      toastMessage: installing
        ? 'ยกล้อแม็กสวมเข้าดุมแล้ว — ใช้บล็อกลม (3) ยิงน็อตล้อทั้ง 5 ตัวและขันปอนด์ 110 Nm'
        : 'ยกล้อแม็กหน้าขวาออกจากดุมแล้ว — เข้าถึงคาลิปเปอร์และจานดิสก์เบรกได้',
      toastType: 'info',
    };
  }

  if (partId === 'caliper_fr') {
    const installing = !state.caliperInstalled;
    soundEngine.playPartClunk(true);
    return {
      nextState: { ...state, caliperInstalled: installing },
      toastMessage: installing
        ? 'สวมคาลิปเปอร์เบรก 4 พอตกลับเข้าที่แล้ว — ใช้ประแจบล็อก (2) ขันสลัก 14mm และวัดปอนด์ 35 Nm'
        : 'ถอดคาลิปเปอร์เบรกออกแล้ว — สามารถถอดเปลี่ยนผ้าเบรกได้',
      toastType: 'info',
    };
  }

  if (partId === 'brake_pads_fr') {
    soundEngine.playPartClunk(false);
    if (state.brakePadsInstalled) {
      return {
        nextState: { ...state, brakePadsInstalled: false },
        toastMessage: 'ถอดชุดผ้าเบรกเก่าที่สึกหรอออกจากจานดิสก์แล้ว · คลิกซ้ำเพื่อใส่ผ้าเบรกเซรามิกใหม่',
        toastType: 'info',
      };
    }
    return {
      nextState: {
        ...state,
        brakePadsInstalled: true,
        brakePadsCondition: 'good',
      },
      toastMessage: 'ติดตั้งผ้าเบรกเซรามิกเกรดพรีเมียมชุดใหม่เข้ากับจานดิสก์เรียบร้อย!',
      toastType: 'success',
    };
  }

  return null;
}

// Check if all underlying mechanical faults are genuinely resolved when clearing DTC codes
export function recomputeRemainingFaultCodes(state: CarSimState): string[] {
  const remaining: string[] = [];

  if (!state.sparkPlugsInstalled[1] || state.sparkPlugConditions[1] !== 'good' || !state.coilsInstalled[1]) {
    remaining.push('P0302 — สูบที่ 2 จุดระเบิดผิดพลาด (ยังไม่ได้เปลี่ยนหัวเทียน/เสียบคอยล์สูบ 2)');
  }
  if (!state.sparkPlugsInstalled[3] || state.sparkPlugConditions[3] !== 'good' || !state.coilsInstalled[3]) {
    remaining.push('P0304 — สูบที่ 4 จุดระเบิดผิดพลาด (ยังไม่ได้เปลี่ยนหัวเทียน/เสียบคอยล์สูบ 4)');
  }
  if (!state.batteryInstalled || state.batteryCondition !== 'good') {
    remaining.push('P0562 — แรงดันไฟแบตเตอรี่ต่ำกว่าเกณฑ์');
  }
  if (
    state.oilQuality !== 'good' ||
    state.oilLevelPercent < 75 ||
    !state.oilFilterInstalled ||
    state.oilFilterCondition !== 'good'
  ) {
    if (state.activeDtcCodes.some((c) => c.startsWith('P0524'))) {
      remaining.push('P0524 — น้ำมันเครื่องยังไม่สะอาด/ระดับต่ำกว่าเกณฑ์ หรือยังไม่ได้เปลี่ยนกรองน้ำมัน');
    }
  }
  if (!state.airFilterInstalled || state.airFilterCondition !== 'good') {
    if (state.activeDtcCodes.some((c) => c.startsWith('P0171'))) {
      remaining.push('P0171 — ไส้กรองอากาศยังอุดตันหรือยังไม่ได้ติดตั้ง');
    }
  }
  if (!state.brakePadsInstalled || state.brakePadsCondition !== 'good') {
    if (state.activeDtcCodes.some((c) => c.startsWith('C0035'))) {
      remaining.push('C0035 — เซนเซอร์เตือนผ้าเบรกหน้าขวาสึกหรอ (ยังไม่ได้ใส่ผ้าเบรกใหม่)');
    }
  }

  return remaining;
}

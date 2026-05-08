import { Router } from "express";
import { db } from "@workspace/db";
import { requireAuth, requireRole } from "../middlewares/auth";
import { sql } from "drizzle-orm";

const router = Router();

// ── Employee Profiles ────────────────────────────────────────────────────────

// GET /api/hr/employees
router.get("/employees", requireAuth, async (req, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT u.id, u.username, u.name, u.email, u.role, u.is_active,
             ep.id as profile_id, ep.position, ep.department, ep.base_salary,
             ep.salary_type, ep.join_date, ep.phone, ep.address,
             ep.emergency_contact, ep.notes
      FROM users u
      LEFT JOIN employee_profiles ep ON ep.user_id = u.id
      ORDER BY u.name ASC
    `);
    res.json(rows.rows);
  } catch (e) { res.status(500).json({ error: "Server error" }); }
});

// POST /api/hr/employees/:userId/profile
router.post("/employees/:userId/profile", requireAuth, requireRole(["super_admin","admin"]), async (req, res) => {
  const userId = Number(req.params.userId);
  const { position, department, baseSalary, salaryType, joinDate, phone, address, emergencyContact, notes } = req.body;
  try {
    await db.execute(sql`
      INSERT INTO employee_profiles (user_id, position, department, base_salary, salary_type, join_date, phone, address, emergency_contact, notes)
      VALUES (${userId}, ${position||null}, ${department||null}, ${baseSalary||0}, ${salaryType||'monthly'}, ${joinDate||null}, ${phone||null}, ${address||null}, ${emergencyContact||null}, ${notes||null})
      ON CONFLICT (user_id) DO UPDATE SET
        position = EXCLUDED.position, department = EXCLUDED.department,
        base_salary = EXCLUDED.base_salary, salary_type = EXCLUDED.salary_type,
        join_date = EXCLUDED.join_date, phone = EXCLUDED.phone,
        address = EXCLUDED.address, emergency_contact = EXCLUDED.emergency_contact,
        notes = EXCLUDED.notes, updated_at = NOW()
    `);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: "Server error" }); }
});

// ── Attendance ───────────────────────────────────────────────────────────────

// GET /api/hr/attendance?month=2026-05
router.get("/attendance", requireAuth, async (req, res) => {
  const { month, userId } = req.query;
  try {
    let query = sql`
      SELECT a.*, u.name as user_name, u.username
      FROM attendances a
      JOIN users u ON u.id = a.user_id
      WHERE 1=1
    `;
    if (month) query = sql`${query} AND to_char(a.date, 'YYYY-MM') = ${month}`;
    if (userId) query = sql`${query} AND a.user_id = ${Number(userId)}`;
    query = sql`${query} ORDER BY a.date DESC, u.name ASC`;
    const rows = await db.execute(query);
    res.json(rows.rows);
  } catch (e) { res.status(500).json({ error: "Server error" }); }
});

// POST /api/hr/attendance
router.post("/attendance", requireAuth, requireRole(["super_admin","admin"]), async (req, res) => {
  const { userId, date, checkIn, checkOut, status, note } = req.body;
  const recordedBy = (req as any).user.id;
  try {
    await db.execute(sql`
      INSERT INTO attendances (user_id, date, check_in, check_out, status, note, recorded_by)
      VALUES (${userId}, ${date}, ${checkIn||null}, ${checkOut||null}, ${status||'present'}, ${note||null}, ${recordedBy})
      ON CONFLICT (user_id, date) DO UPDATE SET
        check_in = EXCLUDED.check_in, check_out = EXCLUDED.check_out,
        status = EXCLUDED.status, note = EXCLUDED.note, recorded_by = EXCLUDED.recorded_by
    `);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Leave Requests ───────────────────────────────────────────────────────────

// GET /api/hr/leaves
router.get("/leaves", requireAuth, async (req, res) => {
  const { status } = req.query;
  try {
    let query = sql`
      SELECT l.*, u.name as user_name, u.username,
             a.name as approved_by_name
      FROM leave_requests l
      JOIN users u ON u.id = l.user_id
      LEFT JOIN users a ON a.id = l.approved_by
      WHERE 1=1
    `;
    if (status) query = sql`${query} AND l.status = ${status}`;
    query = sql`${query} ORDER BY l.created_at DESC`;
    const rows = await db.execute(query);
    res.json(rows.rows);
  } catch (e) { res.status(500).json({ error: "Server error" }); }
});

// POST /api/hr/leaves
router.post("/leaves", requireAuth, async (req, res) => {
  const { userId, startDate, endDate, reason } = req.body;
  try {
    await db.execute(sql`
      INSERT INTO leave_requests (user_id, start_date, end_date, reason)
      VALUES (${userId}, ${startDate}, ${endDate}, ${reason})
    `);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: "Server error" }); }
});

// PATCH /api/hr/leaves/:id
router.patch("/leaves/:id", requireAuth, requireRole(["super_admin","admin"]), async (req, res) => {
  const id = Number(req.params.id);
  const { status } = req.body;
  const approvedBy = (req as any).user.id;
  try {
    await db.execute(sql`
      UPDATE leave_requests SET status = ${status},
        approved_by = ${approvedBy}, approved_at = NOW()
      WHERE id = ${id}
    `);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: "Server error" }); }
});

// ── Salary ───────────────────────────────────────────────────────────────────

// GET /api/hr/salary?period=2026-05
router.get("/salary", requireAuth, requireRole(["super_admin","admin"]), async (req, res) => {
  const { period } = req.query;
  try {
    let query = sql`
      SELECT sp.*, u.name as user_name, u.username, u.role
      FROM salary_payments sp
      JOIN users u ON u.id = sp.user_id
      WHERE 1=1
    `;
    if (period) query = sql`${query} AND sp.period = ${period}`;
    query = sql`${query} ORDER BY sp.created_at DESC`;
    const rows = await db.execute(query);
    res.json(rows.rows);
  } catch (e) { res.status(500).json({ error: "Server error" }); }
});

// POST /api/hr/salary/generate - auto generate dari absen bulan ini
router.post("/salary/generate", requireAuth, requireRole(["super_admin","admin"]), async (req, res) => {
  const { period } = req.body; // YYYY-MM
  const createdBy = (req as any).user.id;
  try {
    // Get all employees with profiles
    const employees = await db.execute(sql`
      SELECT u.id, u.name, ep.base_salary, ep.salary_type
      FROM users u
      JOIN employee_profiles ep ON ep.user_id = u.id
      WHERE u.is_active = true
    `);

    for (const emp of employees.rows as any[]) {
      // Count attendance for period
      const att = await db.execute(sql`
        SELECT
          COUNT(*) FILTER (WHERE status IN ('present','late')) as days_present,
          COUNT(*) FILTER (WHERE status = 'absent') as days_absent
        FROM attendances
        WHERE user_id = ${emp.id} AND to_char(date, 'YYYY-MM') = ${period}
      `);
      const daysPresent = Number((att.rows[0] as any).days_present) || 0;
      const daysAbsent = Number((att.rows[0] as any).days_absent) || 0;
      const base = Number(emp.base_salary);
      const net = base; // bisa dikustomisasi

      await db.execute(sql`
        INSERT INTO salary_payments (user_id, period, base_salary, net_salary, total_days_present, total_days_absent, created_by)
        VALUES (${emp.id}, ${period}, ${base}, ${net}, ${daysPresent}, ${daysAbsent}, ${createdBy})
        ON CONFLICT DO NOTHING
      `);
    }
    res.json({ success: true, generated: employees.rows.length });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// PATCH /api/hr/salary/:id - update bonus/deduction/status
router.patch("/salary/:id", requireAuth, requireRole(["super_admin","admin"]), async (req, res) => {
  const id = Number(req.params.id);
  const { bonus, deduction, note, status } = req.body;
  try {
    await db.execute(sql`
      UPDATE salary_payments SET
        bonus = COALESCE(${bonus ?? null}, bonus),
        deduction = COALESCE(${deduction ?? null}, deduction),
        note = COALESCE(${note ?? null}, note),
        status = COALESCE(${status ?? null}, status),
        net_salary = base_salary + COALESCE(${bonus ?? null}, bonus) - COALESCE(${deduction ?? null}, deduction),
        paid_at = CASE WHEN ${status ?? null} = 'paid' THEN NOW() ELSE paid_at END
      WHERE id = ${id}
    `);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;

import { ReservaStateMachine, ReservaEstado, ReservaConFranja } from './reserva.state-machine';
import { BadRequestException } from '@nestjs/common';

describe('ReservaStateMachine', () => {
  describe('validarTransicion', () => {
    it('debería permitir transiciones válidas desde CONFIRMADA', () => {
      expect(() => ReservaStateMachine.validarTransicion('CONFIRMADA', 'EN_CURSO')).not.toThrow();
      expect(() => ReservaStateMachine.validarTransicion('CONFIRMADA', 'CANCELADA')).not.toThrow();
    });

    it('debería permitir transiciones válidas desde EN_CURSO', () => {
      expect(() => ReservaStateMachine.validarTransicion('EN_CURSO', 'COMPLETADA')).not.toThrow();
      expect(() => ReservaStateMachine.validarTransicion('EN_CURSO', 'CANCELADA')).not.toThrow();
    });

    it('debería rechazar transiciones inválidas desde CONFIRMADA', () => {
      expect(() => ReservaStateMachine.validarTransicion('CONFIRMADA', 'COMPLETADA')).toThrow(BadRequestException);
      expect(() => ReservaStateMachine.validarTransicion('CONFIRMADA', 'CONFIRMADA')).toThrow(BadRequestException);
    });

    it('debería rechazar transiciones inválidas desde EN_CURSO', () => {
      expect(() => ReservaStateMachine.validarTransicion('EN_CURSO', 'CONFIRMADA')).toThrow(BadRequestException);
      expect(() => ReservaStateMachine.validarTransicion('EN_CURSO', 'EN_CURSO')).toThrow(BadRequestException);
    });

    it('debería rechazar cualquier transición desde estados terminales', () => {
      expect(() => ReservaStateMachine.validarTransicion('COMPLETADA', 'CANCELADA')).toThrow(BadRequestException);
      expect(() => ReservaStateMachine.validarTransicion('CANCELADA', 'CONFIRMADA')).toThrow(BadRequestException);
    });
  });

  describe('validarAnticipacionCancelacion', () => {
    const reservaAutogestionada: ReservaConFranja = {
      id_reserva: 'test-id',
      estado: 'CONFIRMADA',
      origen: 'AUTOGESTIONADA',
      fecha: new Date('2026-10-15'),
      id_franja: 'franja-1',
      franjaHoraria: {
        hora_inicio: new Date('1970-01-01T14:00:00Z'),
        hora_fin: new Date('1970-01-01T16:00:00Z'),
      },
    };

    const reservaManual: ReservaConFranja = {
      ...reservaAutogestionada,
      origen: 'MANUAL_GERENCIA',
    };

    it('debería permitir cancelación con más de 24h de anticipación para autogestionada', () => {
      const reservaFutura = {
        ...reservaAutogestionada,
        fecha: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 horas en el futuro
      };
      expect(() => ReservaStateMachine.validarTransicion('CONFIRMADA', 'CANCELADA', reservaFutura)).not.toThrow();
    });

    it('debería rechazar cancelación con menos de 24h de anticipación para autogestionada', () => {
      const reservaProxima = {
        ...reservaAutogestionada,
        fecha: new Date(Date.now() + 12 * 60 * 60 * 1000), // 12 horas en el futuro
      };
      expect(() => ReservaStateMachine.validarTransicion('CONFIRMADA', 'CANCELADA', reservaProxima)).toThrow(BadRequestException);
    });

    it('debería permitir cancelación sin validación de anticipación para reservas manuales', () => {
      const reservaProxima = {
        ...reservaManual,
        fecha: new Date(Date.now() + 12 * 60 * 60 * 1000),
      };
      expect(() => ReservaStateMachine.validarTransicion('CONFIRMADA', 'CANCELADA', reservaProxima)).not.toThrow();
    });

    it('debería permitir cancelación si no hay franja horaria', () => {
      const reservaSinFranja = { ...reservaAutogestionada, franjaHoraria: undefined };
      expect(() => ReservaStateMachine.validarTransicion('CONFIRMADA', 'CANCELADA', reservaSinFranja)).not.toThrow();
    });
  });

  describe('getEstadosPermitidos', () => {
    it('debería retornar estados permitidos para CONFIRMADA', () => {
      const estados = ReservaStateMachine.getEstadosPermitidos('CONFIRMADA');
      expect(estados).toEqual(['EN_CURSO', 'CANCELADA']);
    });

    it('debería retornar estados permitidos para EN_CURSO', () => {
      const estados = ReservaStateMachine.getEstadosPermitidos('EN_CURSO');
      expect(estados).toEqual(['COMPLETADA', 'CANCELADA']);
    });

    it('debería retornar array vacío para estados terminales', () => {
      expect(ReservaStateMachine.getEstadosPermitidos('COMPLETADA')).toEqual([]);
      expect(ReservaStateMachine.getEstadosPermitidos('CANCELADA')).toEqual([]);
    });
  });

  describe('esEstadoTerminal', () => {
    it('debería retornar true para estados terminales', () => {
      expect(ReservaStateMachine.esEstadoTerminal('COMPLETADA')).toBe(true);
      expect(ReservaStateMachine.esEstadoTerminal('CANCELADA')).toBe(true);
    });

    it('debería retornar false para estados no terminales', () => {
      expect(ReservaStateMachine.esEstadoTerminal('CONFIRMADA')).toBe(false);
      expect(ReservaStateMachine.esEstadoTerminal('EN_CURSO')).toBe(false);
    });
  });
});
export type ProblemaApi = {
  type?: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
};

export type RolUsuario = 'GESTOR_DESPACHO' | string;

export type SesionUsuario = {
  token: string;
  usuarioId: string;
  roles: RolUsuario[];
};

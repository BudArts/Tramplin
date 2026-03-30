

import httpx
from typing import Optional, Dict, Any
from app.config import settings
from app.schemas.company import CompanyFNSData
import logging

logger = logging.getLogger(__name__)


class FNSService:
    """Сервис для работы с API ФНС"""
    
    def __init__(self):
        self.api_url = settings.FNS_API_URL
        self.api_key = settings.FNS_API_KEY
        self.dadata_key = settings.DADATA_API_KEY  
    
    async def get_company_by_inn(self, inn: str) -> Optional[CompanyFNSData]:
        """
        Получить данные компании по ИНН из ФНС API
        """
        
        if not self.validate_inn(inn):
            logger.error(f"Invalid INN format: {inn}")
            return None
        
        
        result = await self._get_company_from_fns(inn)
        
        
        if result is None and self.dadata_key:
            logger.info(f"Trying DaData for INN: {inn}")
            result = await self.get_company_by_inn_dadata(inn)
        
        return result
    
    async def _get_company_from_fns(self, inn: str) -> Optional[CompanyFNSData]:
        """
        Запрос к официальному API ФНС
        """
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                
                if not self.api_url or not self.api_key:
                    logger.warning("FNS API URL or KEY not configured")
                    return None
                
                response = await client.get(
                    f"{self.api_url}/egr",
                    params={
                        "req": inn,
                        "key": self.api_key
                    }
                )
                
                
                logger.info(f"FNS API response status: {response.status_code}")
                
                if response.status_code != 200:
                    logger.error(f"FNS API error: {response.status_code}")
                    logger.error(f"Response content: {response.text[:500]}")
                    return None
                
                
                if not response.text:
                    logger.error("Empty response from FNS API")
                    return None
                
                try:
                    data = response.json()
                except Exception as json_error:
                    logger.error(f"Failed to parse JSON from FNS API: {json_error}")
                    logger.error(f"Response text: {response.text[:500]}")
                    return None
                
                
                if "items" not in data or len(data["items"]) == 0:
                    logger.warning(f"Company not found for INN: {inn}")
                    return None
                
                item = data["items"][0]
                
                
                fns_data = CompanyFNSData(
                    inn=inn,
                    ogrn=item.get("ОГРН") or item.get("ogrn"),
                    kpp=item.get("КПП") or item.get("kpp"),
                    full_name=self._extract_name(item),
                    short_name=item.get("НаимСокр") or item.get("short_name"),
                    legal_address=self._extract_address(item),
                    director_name=self._extract_director_name(item),
                    director_position=self._extract_director_position(item),
                    status=self._extract_status(item),
                    registration_date=item.get("ДатаРег") or item.get("registration_date"),
                    raw_data=item
                )
                
                return fns_data
                
        except httpx.TimeoutException:
            logger.error(f"FNS API timeout for INN: {inn}")
            return None
        except Exception as e:
            logger.error(f"FNS API error for INN {inn}: {e}")
            return None
    
    async def get_company_by_inn_dadata(self, inn: str) -> Optional[CompanyFNSData]:
        """
        Альтернативный метод через DaData API
        """
        
        if not self.dadata_key:
            logger.error("DaData API key is not configured")
            return None
        
        
        dadata_token = self.dadata_key.strip()
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                headers = {
                    "Authorization": f"Token {dadata_token}",
                    "Content-Type": "application/json"
                }
                
                logger.info(f"Calling DaData API for INN: {inn}")
                
                response = await client.post(
                    "https://suggestions.dadata.ru/suggestions/api/4_1/rs/findById/party",
                    headers=headers,
                    json={"query": inn}
                )
                
                logger.info(f"DaData API response status: {response.status_code}")
                
                if response.status_code != 200:
                    logger.error(f"DaData API error: {response.status_code}")
                    logger.error(f"Response: {response.text[:500]}")
                    return None
                
                
                if not response.text:
                    logger.error("Empty response from DaData API")
                    return None
                
                try:
                    data = response.json()
                except Exception as json_error:
                    logger.error(f"Failed to parse JSON from DaData: {json_error}")
                    return None
                
                if not data.get("suggestions"):
                    logger.warning(f"Company not found in DaData for INN: {inn}")
                    return None
                
                suggestion = data["suggestions"][0]
                company_data = suggestion.get("data", {})
                
                fns_data = CompanyFNSData(
                    inn=inn,
                    ogrn=company_data.get("ogrn"),
                    kpp=company_data.get("kpp"),
                    full_name=company_data.get("name", {}).get("full_with_opf", ""),
                    short_name=company_data.get("name", {}).get("short_with_opf"),
                    legal_address=company_data.get("address", {}).get("value"),
                    director_name=company_data.get("management", {}).get("name"),
                    director_position=company_data.get("management", {}).get("post"),
                    status=self._map_dadata_status(company_data.get("state", {}).get("status")),
                    registration_date=company_data.get("state", {}).get("registration_date"),
                    raw_data=company_data
                )
                
                return fns_data
                
        except httpx.TimeoutException:
            logger.error(f"DaData API timeout for INN: {inn}")
            return None
        except Exception as e:
            logger.error(f"DaData API error for INN {inn}: {e}")
            return None
    
    
                
        except httpx.TimeoutException:
            logger.error(f"FNS API timeout for INN: {inn}")
            return None
        except Exception as e:
            logger.error(f"FNS API error for INN {inn}: {e}")
            return None
    
    async def get_company_by_inn_dadata(self, inn: str) -> Optional[CompanyFNSData]:
        """
        Альтернативный метод через DaData API
        (более надёжный, но платный)
        """
        dadata_token = settings.FNS_API_KEY  
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    "https://suggestions.dadata.ru/suggestions/api/4_1/rs/findById/party",
                    headers={
                        "Authorization": f"Token {dadata_token}",
                        "Content-Type": "application/json"
                    },
                    json={"query": inn}
                )
                
                if response.status_code != 200:
                    logger.error(f"DaData API error: {response.status_code}")
                    return None
                
                data = response.json()
                
                if not data.get("suggestions"):
                    logger.warning(f"Company not found in DaData for INN: {inn}")
                    return None
                
                suggestion = data["suggestions"][0]
                company_data = suggestion.get("data", {})
                
                fns_data = CompanyFNSData(
                    inn=inn,
                    ogrn=company_data.get("ogrn"),
                    kpp=company_data.get("kpp"),
                    full_name=company_data.get("name", {}).get("full_with_opf", ""),
                    short_name=company_data.get("name", {}).get("short_with_opf"),
                    legal_address=company_data.get("address", {}).get("value"),
                    director_name=company_data.get("management", {}).get("name"),
                    director_position=company_data.get("management", {}).get("post"),
                    status=self._map_dadata_status(company_data.get("state", {}).get("status")),
                    registration_date=company_data.get("state", {}).get("registration_date"),
                    raw_data=company_data
                )
                
                return fns_data
                
        except Exception as e:
            logger.error(f"DaData API error for INN {inn}: {e}")
            return None
    
    def _extract_name(self, item: Dict[str, Any]) -> str:
        """Извлечение названия компании"""
        
        name_keys = ["НаsimПолworking", "name", "full_name", "Наименование"]
        for key in name_keys:
            if key in item and item[key]:
                return item[key]
        return "Неизвестная компания"
    
    def _extract_address(self, item: Dict[str, Any]) -> Optional[str]:
        """Извлечение адреса"""
        address_keys = ["Адрес", "address", "АдресПолworking"]
        for key in address_keys:
            if key in item and item[key]:
                if isinstance(item[key], dict):
                    return item[key].get("value") or item[key].get("full")
                return item[key]
        return None
    
    def _extract_director_name(self, item: Dict[str, Any]) -> Optional[str]:
        """Извлечение имени руководителя"""
        if "Руководитель" in item:
            director = item["Руководитель"]
            if isinstance(director, dict):
                return director.get("ФИО") or director.get("name")
            return director
        if "management" in item:
            return item["management"].get("name")
        return None
    
    def _extract_director_position(self, item: Dict[str, Any]) -> Optional[str]:
        """Извлечение должности руководителя"""
        if "Руководитель" in item:
            director = item["Руководитель"]
            if isinstance(director, dict):
                return director.get("Должность") or director.get("post")
        if "management" in item:
            return item["management"].get("post")
        return None
    
    def _extract_status(self, item: Dict[str, Any]) -> str:
        """Извлечение статуса компании"""
        status_keys = ["Статус", "status", "state"]
        for key in status_keys:
            if key in item:
                status = item[key]
                if isinstance(status, dict):
                    return status.get("status") or status.get("value") or "unknown"
                return status
        return "unknown"
    
    def _map_dadata_status(self, status: Optional[str]) -> str:
        """Преобразование статуса DaData в человекочитаемый"""
        status_map = {
            "ACTIVE": "Действующее",
            "LIQUIDATING": "В процессе ликвидации",
            "LIQUIDATED": "Ликвидировано",
            "BANKRUPT": "Банкротство",
            "REORGANIZING": "Реорганизация"
        }
        return status_map.get(status, status or "Неизвестно")
    
    def validate_inn(self, inn: str) -> bool:
        """
        Валидация ИНН по контрольной сумме
        """
        if not inn.isdigit():
            return False
        
        if len(inn) == 10:
            
            coefficients = [2, 4, 10, 3, 5, 9, 4, 6, 8]
            checksum = sum(int(inn[i]) * coefficients[i] for i in range(9)) % 11 % 10
            return checksum == int(inn[9])
        
        elif len(inn) == 12:
            
            coef1 = [7, 2, 4, 10, 3, 5, 9, 4, 6, 8]
            coef2 = [3, 7, 2, 4, 10, 3, 5, 9, 4, 6, 8]
            
            check1 = sum(int(inn[i]) * coef1[i] for i in range(10)) % 11 % 10
            check2 = sum(int(inn[i]) * coef2[i] for i in range(11)) % 11 % 10
            
            return check1 == int(inn[10]) and check2 == int(inn[11])
        
        return False



fns_service = FNSService()